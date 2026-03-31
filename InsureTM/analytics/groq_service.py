import os
import groq
import base64
from django.db import connection

class GroqService:
    def __init__(self):
        self.client = groq.Groq(
            api_key=os.environ.get("GROQ_API_KEY"),
        )
        
    def get_dynamic_schema(self, role, user_id):
        base_schema = """
        You are an expert PostgreSQL Data Analyst. Use the following database schema to answer user questions by generating a valid SQL query.
        
        Tables and Columns:
        """
        
        # 1. users_user - only visible to ADMIN
        if role == 'ADMIN':
            base_schema += "\n1. users_user (id, username, email, role, is_active, first_name, last_name)"
        
        base_schema += """
        2. campaigns_campaign (id, title, description, start_date, estimated_end_date, created_at, scheduled_at, is_processed, nb_test_cases, project_id, imported_by_id)
        3. "testCases_testcase" (id, test_case_ref, data_json, status, campaign_id, tester_id, execution_date)
           - status values: 'PENDING', 'PASSED', 'FAILED'
        4. "Project_project" (id, name, description, status, created_at, problem_statement, technologies, features)
        5. anomalies_anomalie (id, titre, description, criticite, cree_le, test_case_id, cree_par_id)
           - criticite values: 'FAIBLE', 'MOYENNE', 'CRITIQUE'
        
        Rules:
        - Return ONLY the SQL query.
        - Ensure table names are double-quoted if they contain mixed case or special characters.
        """
        return base_schema

    def generate_sql(self, question, user):
        dynamic_schema = self.get_dynamic_schema(user.role, user.id)
        security_constraints = ""
        
        if user.role == 'ADMIN':
            security_constraints = "You are an ADMIN. Full access granted."
        elif user.role == 'MANAGER':
            security_constraints = f"You are a MANAGER (User ID: {user.id}). No access to users_user."
        else:
            security_constraints = f"You are a TESTER (User ID: {user.id}). Row-level security for your data."

        completion = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{dynamic_schema}\n\n{security_constraints}"},
                {"role": "user", "content": f"Generate a SQL query to answer: {question}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
        )
        sql_query = completion.choices[0].message.content.strip()
        if sql_query.startswith("```"):
             sql_query = sql_query.strip("`").replace("sql", "").strip()
        return sql_query

    def execute_query(self, sql_query):
        from datetime import datetime, date
        from decimal import Decimal

        def serialize_value(v):
            if isinstance(v, (datetime, date)): return v.isoformat()
            if isinstance(v, Decimal): return float(v)
            return v

        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()

        return [{k: serialize_value(v) for k, v in zip(columns, row)} for row in results]

    def analyze_image(self, image_file, question):
        """Analyze an image using Groq's Vision model."""
        image_bytes = image_file.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"En tant qu'expert QA, analyse cette capture d'écran et réponds à : {question}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            model="llama-3.2-11b-vision-preview",
        )
        return completion.choices[0].message.content

    def generate_plotly_config(self, data, question):
        """Generate a Plotly.js configuration JSON based on data and question."""
        prompt = f"""
        Given the following data: {data}
        And the user's question: {question}
        
        Generate a high-quality Plotly.js configuration in JSON format.
        Return ONLY the JSON object with 'data' and 'layout' keys.
        
        Guidelines for CLARITY & AESTHETICS:
        1. If the data is a raw list of items (e.g. Names per Category), AGGREGATE them (count occurrences).
        2. Use vibrant, varied categorical colors (e.g. ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b']).
        3. For single-trace charts, use a beautiful gradient or a very bright primary color.
        4. Always use `mode: 'lines+markers'` for scatter/line charts.
        5. Set `marker: {{ size: 12, opacity: 0.9, line: {{ width: 2, color: 'white' }} }}`.
        6. In `layout`, use `plot_bgcolor: 'rgba(0,0,0,0)'` and `paper_bgcolor: 'rgba(0,0,0,0)'`.
        7. Use `hovertemplate` for rich tooltips.
        
        Example JSON: {{"data": [{{ "type": "bar", "x": ["v1", "v2"], "y": [12, 5], "name": "Tests" }}], "layout": {{ "title": "Répartition", "xaxis": {{ "title": "Version" }} }} }}
        """
        
        completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
        )
        config_text = completion.choices[0].message.content.strip()
        if config_text.startswith("```json"):
            config_text = config_text.replace("```json", "").replace("```", "").strip()
        return config_text

    def process_query(self, question, user, image=None):
        try:
            # Case 1: Vision analysis if image is provided
            if image:
                answer = self.analyze_image(image, question)
                return {"answer": answer, "type": "text", "sql": "", "data": []}
            
            # Case 2: Data query
            sql_query = self.generate_sql(question, user)
            data = self.execute_query(sql_query)
            
            # Decide if we use Plotly for complex requests
            complex_keywords = ['radar', 'scatter', 'bulles', 'comparative', 'avancé', 'plotly', 'graphique', 'chart', 'graphe', 'graphical']
            is_complex = any(kw in question.lower() for kw in complex_keywords)
            
            if is_complex and len(data) > 0:
                plotly_config = self.generate_plotly_config(data, question)
                return {
                    "answer": "Voici l'analyse visuelle avancée :",
                    "sql": sql_query,
                    "data": plotly_config, # For plotly, data is the JSON config string
                    "type": "plotly"
                }
            
            # Default heuristics for simple charts
            chart_type = "table"
            if len(data) > 0:
                if len(data) == 1 and len(data[0]) == 1: chart_type = "metric"
                elif any(k in data[0] for k in ["count", "total"]): chart_type = "bar"
                elif any(k in str(data[0].keys()) for k in ["date", "time"]): chart_type = "line"
            
            return {
                "answer": "Voici les résultats de l'analyse :",
                "sql": sql_query,
                "data": data,
                "type": chart_type
            }
        except Exception as e:
            return {
                "answer": f"Erreur d'analyse : {str(e)}",
                "type": "error", "sql": "", "data": []
            }

    def reformulate_message(self, text, is_subject=False):
        system_prompt = f"Expert QA Platform Analyser. Rewrite as professional {'SUBJECT' if is_subject else 'BODY'}. French. Clear, concise."
        try:
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Reformulate: {text}"}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
            )
            return completion.choices[0].message.content.strip()
        except Exception: return text
