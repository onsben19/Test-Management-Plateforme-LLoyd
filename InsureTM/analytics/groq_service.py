import os
import groq
import base64
from django.db import connection
from campaigns.models import Campaign

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
        2. campaigns_campaign (id, title, description, start_date, estimated_end_date, created_at, scheduled_at, nb_test_cases, project_id, imported_by_id)
        3. "testCases_testcase" (id, test_case_ref, data_json, status, campaign_id, tester_id, execution_date)
           - status values: 'PENDING', 'PASSED', 'FAILED'
        4. "Project_project" (id, name, description, status, created_at)
        5. anomalies_anomalie (id, titre, description, impact, priorite, visibilite, cree_le, test_case_id, cree_par_id)
           - impact values: 'BLOQUANTES', 'CRITIQUE', 'MAJEUR', 'MINEURS', 'COSMETIQUE', 'TEXTE', 'SIMPLE', 'FONCTIONNALITE'
        
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
        
        CRITICAL SPATIAL RULES (Avoid 'Spacing Error'):
        1. TITLE: MANDATORY: Set 'title': {{ 'text': question }} in layout. It will be rendered as a header.
        2. LEGEND: ALWAYS use 'legend': {{ 'orientation': 'h', 'y': -0.2, 'x': 0.5, 'xanchor': 'center', 'font': {{ 'size': 13 }} }}.
        3. MARGINS: Use 'margin': {{ 't': 10, 'b': 20, 'l': 10, 'r': 10 }} for maximum chart diameter.
        4. AXIS: For Bar/Line, use 'xaxis': {{ 'tickangle': -30, 'automargin': true, 'tickfont': {{ 'size': 12 }} }}.
        5. PIE/DONUT: MANDATORY for large visibility: 
           - Set 'hole': 0.4.
           - Set 'textinfo': 'percent+label'.
           - Set 'textposition': 'outside'.
           - CRITICAL: Set 'domain': {{ 'x': [0, 1], 'y': [0.1, 0.9] }} to maximize diameter.
           - For 3 or fewer slices, use 'pull': [0.03, 0.03, 0.03] to make it prominent.
        6. RADAR/POLAR: In layout, use 'polar': {{ 'radialaxis': {{ 'visible': true }}, 'angularaxis': {{ 'tickfont': {{ 'size': 14 }} }} }}.
        7. COLORS: Use the vibrant palette: ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e'].
        8. FONT: Set global font color to '#f1f5f9' (slate-100).
        9. BACKGROUND: Use 'paper_bgcolor': 'transparent', 'plot_bgcolor': 'transparent'.
        10. AUTO-SCALING: 'autosize': true.
        11. THEME: Always prioritize creating a LARGE graphical representation over small ones. Maximize the chart's diameter or height. Use AT LEAST 90% of the available space.
        12. SPACING: For charts with 2+ series, use 'barmode': 'group'. Ensure labels don't overlap.
        
        Example Output: {{"data": [...], "layout": {{ ... }} }}
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
            
            # Case 2: Readiness Score Intent
            readiness_keywords = ['score', 'readiness', 'prêt', 'déploiement', 'confiance', 'readynace']
            if any(kw in question.lower() for kw in readiness_keywords):
                campaign = Campaign.objects.filter(status='ACTIVE').order_by('-created_at').first()
                if not campaign:
                    campaign = Campaign.objects.order_by('-created_at').first()
                
                if campaign:
                    from .readiness_service import ReleaseReadinessManager
                    readiness = ReleaseReadinessManager().calculate_readiness_score(campaign.id)
                    
                    prompt = f"""
                    Expert QA Platform Analyser. 
                    Explique le 'Release Readiness Score' au manager.
                    
                    Campagne: {campaign.title}
                    Score Actuel: {readiness.get('score', 0)}%
                    Répartition: {readiness.get('breakdown', {})}
                    Raisons précises: {readiness.get('reasons', [])}
                    
                    Question de l'utilisateur: {question}
                    
                    Règles:
                    1. Réponds en Français de manière professionnelle et concise.
                    2. Utilise les 'Raisons précises' pour justifier pourquoi le score est à ce niveau.
                    3. À la fin, propose TOUJOURS une action concrète (ex: reformuler une notification, contacter un testeur, etc.).
                    4. Si le score est < 80%, sois vigilant sur les risques.
                    """
                    completion = self.client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="llama-3.3-70b-versatile",
                        temperature=0.7,
                    )
                    return {
                        "answer": completion.choices[0].message.content,
                        "type": "text", 
                        "sql": "N/A (Calcul de score interne)", 
                        "data": readiness
                    }

            # Case 3: Data query
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
        system_prompt = f"Expert QA Platform Analyser. Rewrite as professional {'SUBJECT (Single line, NO markdown, NO newlines)' if is_subject else 'BODY'}. French. Clear, concise."
        try:
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Reformulate: {text}"}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
            )
            result = completion.choices[0].message.content.strip()
            if is_subject:
                # Remove markdown and newlines
                result = result.replace("**", "").replace("\n", " ").replace("\r", " ").strip()
            return result
        except Exception: return text
    def generate_dashboard_brief(self, stats):
        """Generate a contextual AI brief for the manager dashboard with 5-min time-based rotation and deep data."""
        import time
        
        themes = [
            {"name": "Gestion des Risques", "focus": "les anomalies critiques, les échecs de tests et les retards potentiels.", "target_id": "recent-activity"},
            {"name": "Performance & Vélocité", "focus": "le volume d'exécutions, le taux de succès et la rapidité d'avancement des campagnes.", "target_id": "weekly-activity"},
            {"name": "Qualité logicielle", "focus": "la répartition des anomalies, la robustesse des tests passés et la couverture critique.", "target_id": "manager-anomaly-dist"},
            {"name": "Vision Stratégique", "focus": "l'équilibre entre volume d'exécution, bugs ouverts et état de préparation global (Readiness).", "target_id": "ml-timeline-guard"},
        ]
        
        # Consistent rotation every 5 minutes (300 seconds)
        theme_index = int(time.time() / 300) % len(themes)
        theme = themes[theme_index]
        
        # Format stats for prompt
        active_projects = stats.get('active_projects', 0)
        total_campaigns = stats.get('total_campaigns', 0)
        open_anomalies = stats.get('open_anomalies', 0)
        critical_anomalies = stats.get('critical_impact_count', 0)
        total_passed = stats.get('total_passed', 0)
        total_failed = stats.get('total_failed', 0)
        total_executions = stats.get('total_executions', 0)
        success_rate = stats.get('success_rate', 0)
        readiness_score = stats.get('readiness_score', 0)
        
        prompt = f"""
        En tant qu'expert QA Platform Analyser, génère un brief exécutif complet pour un Manager.
        
        ANGLE D'ANALYSE PRIORITAIRE : {theme['name']} (Ton analyse doit se concentrer particulièrement sur {theme['focus']})
        
        DONNÉES TEMPS RÉEL DU DASHBOARD :
        - État global : {total_executions} exécutions ({total_passed} passés, {total_failed} échoués).
        - Santé : {open_anomalies} anomalies ouvertes (DONT {critical_anomalies} à impact Critique/Bloquant).
        - Volume : {total_campaigns} campagnes sur {active_projects} projets.
        - Performance : {success_rate}% de succès / Readiness Score : {readiness_score}%.
        
        Règles :
        1. Réponds en Français de manière extrêmement professionnelle, concise et percutante (max 3-4 courtes phrases).
        2. Adopte la perspective du thème : {theme['name']}.
        3. FAIS LE LIEN entre les exécutions (succès/échecs) et les anomalies (surtout les critiques).
        4. Identifie immédiatement si la situation globale est 'Critique', 'Stable' ou 'Optimale' sous cet angle.
        5. Donne une recommandation stratégique directe.
        
        Format de réponse attendu : "Analyse {theme['name']} : [Statut]. [Analyse transversale liant exécutions et anomalies]. [Action prioritaire]."
        """
        try:
            completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            return {
                "brief": completion.choices[0].message.content.strip(),
                "target_id": theme['target_id'],
                "theme_name": theme['name']
            }
        except Exception as e:
            return {
                "brief": f"Analyse indisponible : {str(e)}",
                "target_id": None,
                "theme_name": "Inconnu"
            }
