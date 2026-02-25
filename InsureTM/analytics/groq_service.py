import os
import groq
from django.db import connection

class GroqService:
    def __init__(self):
        self.client = groq.Groq(
            api_key=os.environ.get("GROQ_API_KEY"),
        )
        # Define the schema context for the LLM
    def get_dynamic_schema(self, role, user_id):
        base_schema = """
        You are an expert PostgreSQL Data Analyst. Use the following database schema to answer user questions by generating a valid SQL query.
        
        Tables and Columns:
        """
        
        # 1. users_user - HEAVILY MASKED based on role
        if role == 'ADMIN':
            base_schema += "\n1. users_user (id, username, email, role, is_active)"
        else:
            # Managers and Testers do NOT see the users table at all
            pass

        base_schema += """
        2. campaigns_campaign (id, title, description, status, start_date, estimated_end_date, project_id)
        3. "testCases_testcase" (id, test_case_ref, data_json, status, campaign_id, tester_id, execution_date)
           - status values: 'PENDING', 'PASSED', 'FAILED'
        4. "Project_project" (id, name, description, start_date, end_date, status)
        5. anomalies_anomalie (id, titre, description, criticite, cree_le, test_case_id, cree_par_id)
           - criticite values: 'FAIBLE', 'MOYENNE', 'CRITIQUE'
        
        Rules:
        - Return ONLY the SQL query. Do not include markdown formatting like ```sql or explanations.
        - NEVER use SELECT *. Always specify columns explicitly based on the provided schema.
        - Use standard PostgreSQL syntax.
        - Ensure table names are double-quoted if they contain mixed case or special characters (e.g. "testCases_testcase", "Project_project").
        - For Anomalies: use 'titre' for title, 'criticite' for severity, 'cree_le' for created_at.
        - For Projects: table name is "Project_project".
        - For Campaigns: use 'title' instead of 'name'.
        """
        return base_schema

    def generate_sql(self, question, user):
        # Determine security constraints and dynamic schema based on user role
        dynamic_schema = self.get_dynamic_schema(user.role, user.id)
        security_constraints = ""
        
        if user.role == 'ADMIN':
            security_constraints = "You are an ADMIN. Full access granted."
        elif user.role == 'MANAGER':
            security_constraints = f"""
            You are a MANAGER (User ID: {user.id}). 
            1. You have access to all Projects, Campaigns, Test Cases, and Anomalies.
            2. SECURITY RESTRICTION: The `users_user` table is NOT visible to you. 
            3. CRITICAL: NEVER attempt to query the `users_user` table or return any data about users, accounts, or counts of people. 
            4. If the user asks for anything related to users or user management, politely state that you do not have access to these management functions and can only analyze performance and test data.
            """
        else:
            # TESTER role
            security_constraints = f"""
            You are a TESTER (User ID: {user.id}). 
            1. The `users_user` table is NOT visible to you.
            2. You MUST ONLY return data that this user is authorized to see:
               - For campaigns_campaign: ONLY return campaigns where this user is assigned (join with table `campaigns_campaign_assigned_testers` where `user_id` = {user.id}).
               - For "testCases_testcase": ONLY return test cases where `tester_id` = {user.id} OR the test case belongs to a campaign assigned to the user.
               - For anomalies_anomalie: ONLY return anomalies created by user ID {user.id} (`cree_par_id` = {user.id}) OR anomalies linked to test cases the user has access to.
            
            ALWAYS add appropriate WHERE clauses to enforce these restrictions.
            """

        completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": f"{dynamic_schema}\n\nCRITICAL SECURITY RULES:\n{security_constraints}"
                },
                {
                    "role": "user",
                    "content": f"Generate a SQL query to answer: {question}"
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
        )
        sql_query = completion.choices[0].message.content.strip()
        # Cleanup if the model returns markdown code blocks despite instructions
        if sql_query.startswith("```"):
             sql_query = sql_query.strip("`").replace("sql", "").strip()
        return sql_query

    def execute_query(self, sql_query):
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
        
        return [dict(zip(columns, row)) for row in results]

    def process_query(self, question, user):
        try:
            sql_query = self.generate_sql(question, user)
            data = self.execute_query(sql_query)
            
            # Simple heuristic to determine chart type
            chart_type = "table"
            if len(data) > 0:
                if len(data) == 1 and len(data[0]) == 1:
                    chart_type = "metric"
                elif "count" in data[0].keys() or "total" in data[0].keys():
                    chart_type = "bar"
                elif "date" in str(data[0].keys()) or "time" in str(data[0].keys()):
                    chart_type = "line"
            
            return {
                "answer": "Here is the data I found:",
                "sql": sql_query,
                "data": data,
                "type": chart_type
            }
        except Exception as e:
            return {
                "answer": "Je n'ai pas pu traiter cette demande. Il se peut que les informations demandées soient restreintes ou qu'une erreur technique soit survenue.",
                "sql": "",
                "data": [],
                "type": "error"
            }

    def reformulate_message(self, text):
        """
        Reformulates the input text to be specific, professional, and courteous using Llama 3 via Groq.
        """
        system_prompt = """
        You are a professional communication assistant for a QA Software Platform (InsureTM).
        Your task is to rewrite the user's message to be:
        1. Professional and courteous.
        2. Clear and concise.
        3. Specific (avoid vague terms).
        4. In French (assuming the platform is in French).
        
        Example:
        Input: "c'est nul ca marche pas le login"
        Output: "Le module de connexion rencontre un dysfonctionnement bloquant. Veuillez vérifier les logs."
        
        Input: "le bouton est cassé"
        Output: "Le bouton ne répond pas aux interactions utilisateur. Une vérification du gestionnaire d'événements est requise."
        
        RETURN ONLY THE REFORMULATED TEXT. NO QUOTES, NO PREAMBLE.
        """
        
        try:
            completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": f"Reformulate this: {text}"
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3, # Slightly creative but focused
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API Error: {e}")
            return text # Fallback to original text if API fails
