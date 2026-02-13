import os
import groq
from django.db import connection

class GroqService:
    def __init__(self):
        self.client = groq.Groq(
            api_key=os.environ.get("GROQ_API_KEY"),
        )
        # Define the schema context for the LLM
        self.schema_context = """
        You are an expert PostgreSQL Data Analyst. Use the following database schema to answer user questions by generating a valid SQL query.
        
        Tables and Columns:
        
        1. users_user (id, username, email, role, is_active)
        2. campaigns_campaign (id, title, description, status, start_date, estimated_end_date, project_id)
        3. "testCases_testcase" (id, test_case_ref, data_json, status, campaign_id, tester_id, execution_date)
           - status values: 'PENDING', 'PASSED', 'FAILED'
        4. "Project_project" (id, name, description, start_date, end_date, status)
        5. anomalies_anomalie (id, titre, description, criticite, cree_le, test_case_id, cree_par_id)
           - criticite values: 'FAIBLE', 'MOYENNE', 'CRITIQUE'
        
        Rules:
        - Return ONLY the SQL query. Do not include markdown formatting like ```sql or explanations.
        - Use standard PostgreSQL syntax.
        - Ensure table names are double-quoted if they contain mixed case or special characters (e.g. "testCases_testcase", "Project_project").
        - For Anomalies: use 'titre' for title, 'criticite' for severity, 'cree_le' for created_at.
        - For Projects: table name is "Project_project".
        - For Campaigns: use 'title' instead of 'name'.
        """

    def generate_sql(self, question):
        completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": self.schema_context
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

    def process_query(self, question):
        try:
            sql_query = self.generate_sql(question)
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
                "answer": f"I couldn't process that query. Error: {str(e)}",
                "sql": "",
                "data": [],
                "type": "error"
            }
