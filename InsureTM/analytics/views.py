import logging
from django.db.models import Q, Count, Avg, F
from django.utils import timezone

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse
from fpdf import FPDF
from datetime import datetime

from campaigns.models import Campaign
from anomalies.models import Anomalie
from testCases.models import TestCase
from .models import Conversation, Message, SavedVisualization
from .groq_service import GroqService
from .ml_service import MLTimelineGuard
from .readiness_service import ReleaseReadinessManager
from .serializers import ConversationSerializer, MessageSerializer, SavedVisualizationSerializer
from .ollama_service import OllamaService

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Conversation.objects.all()
        return Conversation.objects.filter(user=user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(conversation.messages.all(), many=True)
        return Response(serializer.data)


class AskAgentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('query')
        conversation_id = request.data.get('conversation_id')

        if not question:
            return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create conversation
        if conversation_id:
            conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        else:
            title = question[:50] + '...' if len(question) > 50 else question
            conversation = Conversation.objects.create(user=request.user, title=title)

        uploaded_file = request.FILES.get('file')
        Message.objects.create(
            conversation=conversation, 
            sender='user', 
            text=question, 
            type='text',
            file=uploaded_file
        )

        try:
            # S'il y a un fichier, on pourrait extraire le texte, mais pour un chatbot général simple on va utiliser le texte
            file_context = ""
            if uploaded_file:
                file_context = f"\n\nL'utilisateur a uploadé un fichier: {uploaded_file.name}. "
                if uploaded_file.name.endswith('.txt') or uploaded_file.name.endswith('.csv'):
                    try:
                        file_content = uploaded_file.read().decode('utf-8')[:2000] # Limiter la taille
                        file_context += f"Voici un extrait du contenu:\n{file_content}\n"
                    except:
                        pass
                elif uploaded_file.name.endswith('.pdf'):
                    try:
                        from pypdf import PdfReader
                        reader = PdfReader(uploaded_file)
                        text = ""
                        for page in reader.pages[:3]: # Limiter à 3 pages
                            text += page.extract_text() + "\n"
                        file_context += f"Voici un extrait du PDF:\n{text[:2000]}\n"
                    except:
                        pass
            
            # Construire l'historique de la conversation
            messages = [{"role": "system", "content": """Tu es un assistant IA général et polyvalent.
Ton objectif est de répondre à n'importe quelle question posée par l'utilisateur, qu'il s'agisse de rédaction, de traduction, de culture générale, d'analyse ou de toute autre tâche.

TES MISSIONS ET RÈGLES :
1. **Formatage Strict :** Utilise systématiquement le **Markdown** pour structurer tes réponses. Mets en gras les termes clés, utilise des listes à puces pour énumérer des idées, et intègre des blocs de code pour tout aspect technique.
2. **Concision et Clarté :** Sois direct et utile. Tes réponses doivent être claires et pertinentes.
3. **Polyvalence Totale :** Tu réponds de manière générale, sans être limité à une base de données ou un domaine précis. Tu ne génères JAMAIS de graphiques.
4. **Langue :** Tu t'exprimes en Français par défaut, de manière chaleureuse et professionnelle."""}]

            # Fetch recent messages for context
            recent_msgs = conversation.messages.all().order_by('created_at')[:10]
            for msg in recent_msgs:
                if msg.sender == 'user':
                    messages.append({"role": "user", "content": msg.text})
                elif msg.sender == 'agent':
                    messages.append({"role": "assistant", "content": msg.text})
            
            # Ajouter le contexte du fichier si présent (à la dernière question)
            if file_context and messages and messages[-1]['role'] == 'user':
                messages[-1]['content'] += file_context

            from analytics.groq_service import GroqService
            groq = GroqService()
            completion = groq.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            answer = completion.choices[0].message.content

            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text=answer,
                type='text',
                sql='',
                data=[],
            )
            conversation.save()

            return Response({
                'answer': answer,
                'data': [],
                'sql': '',
                'type': 'text',
                'conversation_id': conversation.id,
                'conversation_title': conversation.title,
            })

        except Exception:
            logger.exception("Error processing analytics query for user %s", request.user.username)
            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text="Une erreur inattendue est survenue lors de l'analyse des données.",
                type='error',
            )
            return Response({'error': 'An internal error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OllamaChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query')
        context = request.data.get('context', '')
        
        if not query:
            return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Using Groq instead of Ollama for immediate functionality
            groq = GroqService()
            # More general-purpose system prompt
            system_prompt = """
Tu es un assistant IA général et polyvalent.
Ton objectif est de répondre à n'importe quelle question posée par l'utilisateur, qu'il s'agisse de rédaction, de traduction, de culture générale, d'analyse ou de toute autre tâche.

TES MISSIONS ET RÈGLES :
1. **Formatage Strict :** Utilise systématiquement le **Markdown** pour structurer tes réponses. Mets en gras les termes clés, utilise des listes à puces pour énumérer des idées, et intègre des blocs de code pour tout aspect technique.
2. **Concision et Clarté :** Sois direct et utile. Tes réponses doivent être claires et pertinentes.
3. **Polyvalence Totale :** Tu réponds de manière générale, sans être limité à une base de données ou un domaine précis.
4. **Langue :** Tu t'exprimes en Français par défaut, de manière chaleureuse et professionnelle.
"""
            
            completion = groq.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "system", "content": f"Contexte de navigation : {context}"},
                    {"role": "user", "content": query}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            answer = completion.choices[0].message.content
            
            return Response({
                'answer': answer,
                'model': 'Llama 3.3 (Groq)'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExecuteSQLView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sql_query = request.data.get('sql')
        message_id = request.data.get('message_id')

        if not sql_query or not message_id:
            return Response({'error': 'SQL and message_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, conversation__user=request.user)

        try:
            groq = GroqService()
            data = groq.execute_query(sql_query)

            # Heuristics for chart type
            chart_type = "table"
            if len(data) > 0:
                keys = list(data[0].keys())
                if len(data) == 1 and len(keys) == 1:
                    chart_type = "metric"
                elif any(k in str(keys).lower() for k in ["count", "total", "nb"]):
                    chart_type = "bar"
                elif any(k in str(keys).lower() for k in ["date", "time", "day", "mois"]):
                    chart_type = "line"

            message.sql = sql_query
            message.data = data
            message.type = chart_type
            message.save()

            return Response({
                'id': message.id,
                'sender': message.sender,
                'text': message.text,
                'type': message.type,
                'sql': message.sql,
                'data': message.data,
                'created_at': message.created_at
            })
        except Exception as e:
            logger.exception("Error executing manual SQL query")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SavedVisualizationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SavedVisualizationSerializer

    def get_queryset(self):
        return SavedVisualization.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        vis = self.get_object()
        try:
            groq = GroqService()
            data = groq.execute_query(vis.sql)
            vis.data = data
            vis.save()
            serializer = self.get_serializer(vis)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CampaignTimelineGuardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        campaign = get_object_or_404(Campaign, id=campaign_id)

        if request.user.role == 'TESTER':
            if not campaign.assigned_testers.filter(id=request.user.id).exists():
                return Response({'error': 'Accès non autorisé à cette campagne.'}, status=status.HTTP_403_FORBIDDEN)

        result = MLTimelineGuard().get_campaign_status(campaign_id)

        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


class ReformulateMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get('message')
        is_subject = request.data.get('is_subject', False)
        is_test_steps = request.data.get('is_test_steps', False)

        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reformulated = GroqService().reformulate_message(message, is_subject=is_subject, is_test_steps=is_test_steps)
            return Response({'reformulated_message': reformulated})
        except Exception:
            logger.exception("Error reformulating message for user %s", request.user.username)
            return Response({'error': 'An internal error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReleaseReadinessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id=None, project_id=None):
        if project_id:
            result = ReleaseReadinessManager().calculate_readiness_score(project_id=project_id)
        else:
            campaign = get_object_or_404(Campaign, id=campaign_id)
            # Basic role check similar to TimelineGuard
            if request.user.role == 'TESTER':
                if not campaign.assigned_testers.filter(id=request.user.id).exists():
                    return Response({'error': 'Accès non autorisé à cette campagne.'}, status=status.HTTP_403_FORBIDDEN)
            result = ReleaseReadinessManager().calculate_readiness_score(campaign_id=campaign_id)

        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)
class CampaignClosureReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        try:
            campaign = get_object_or_404(Campaign, id=campaign_id)
            logger.info("Generating closure report for campaign %s", campaign_id)
            
            # Security check
            if request.user.role not in ['ADMIN', 'MANAGER']:
                return Response({'error': 'Accès restreint aux administrateurs et managers.'}, status=status.HTTP_403_FORBIDDEN)

            # 1. Gather Data
            readiness_manager = ReleaseReadinessManager()
            readiness_data = readiness_manager.calculate_readiness_score(campaign_id=campaign_id)
            if not readiness_data:
                readiness_data = {"score": 0, "reasons": ["Impossible de calculer le score."], "breakdown": {}}
                
            ml_status = MLTimelineGuard().get_campaign_status(campaign_id)
            if not ml_status:
                ml_status = {"status": "INCONNU", "progress": {"percentage": 0}, "delay_days": 0}
                
            critical_anomalies = Anomalie.objects.filter(test_case__campaign=campaign, impact__in=['CRITIQUE', 'BLOQUANTES']).exclude(statut='RESOLUE')
            logger.info("Data gathered. Score: %s, Anomalies: %d", readiness_data.get('score'), critical_anomalies.count())
            
            # 2. Generate PDF
            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            
            # Header
            pdf.set_fill_color(30, 41, 59)
            pdf.rect(0, 0, 210, 40, 'F')
            
            pdf.set_font('helvetica', 'B', 24)
            pdf.set_text_color(255, 255, 255)
            pdf.set_xy(10, 10)
            pdf.cell(w=pdf.epw, h=15, txt="FICHE DE CLOTURE DE CAMPAGNE", border=0, ln=1, align='L')
            
            pdf.set_font('helvetica', 'I', 10)
            pdf.set_xy(10, 25)
            date_str = datetime.now().strftime('%d/%m/%Y %H:%M')
            author = campaign.imported_by
            author_name = author.get_full_name() if author and author.get_full_name() else (author.username if author else "Inconnu")
            pdf.multi_cell(w=pdf.epw, h=7, txt=f"Document Officiel - Lloyd Assurances - Genere le {date_str}\nPublie par : {author_name}", border=0, align='L')
            
            pdf.set_y(50)
            pdf.set_text_color(30, 41, 59)
            pdf.set_font('helvetica', 'B', 16)
            camp_title = str(campaign.title or 'Sans Titre')
            pdf.multi_cell(w=pdf.epw, h=10, txt=f"Campagne : {camp_title}", border=0, align='L')
            pdf.ln(2)
            
            pdf.set_font('helvetica', '', 12)
            proj_name = str(campaign.project.name if campaign.project else 'N/A')
            pdf.multi_cell(w=pdf.epw, h=8, txt=f"Projet : {proj_name}", border=0, align='L')
            pdf.ln(5)
            
            # Score
            pdf.set_fill_color(248, 250, 252)
            pdf.set_font('helvetica', 'B', 14)
            pdf.cell(w=pdf.epw, h=12, txt="  1. SCORE GLOBAL DE PREPARATION", border=1, ln=1, align='L', fill=True)
            pdf.ln(5)
            
            score = readiness_data.get('score', 0)
            pdf.set_font('helvetica', 'B', 40)
            if score >= 80:
                pdf.set_text_color(16, 185, 129)
            elif score >= 40:
                pdf.set_text_color(245, 158, 11)
            else:
                pdf.set_text_color(239, 68, 68)
            pdf.cell(w=pdf.epw, h=25, txt=f"{score}%", border=0, ln=1, align='C')
            
            pdf.set_text_color(30, 41, 59)
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(w=pdf.epw, h=8, txt="JUSTIFICATION DE L'IA :", border=0, ln=1)
            pdf.set_font('helvetica', '', 10)
            reasons = readiness_data.get('reasons', [])
            if not isinstance(reasons, list):
                reasons = [str(reasons)]
            for reason in reasons:
                # Force a narrower width and explicit move to next line
                safe_reason = str(reason).encode('latin-1', 'replace').decode('latin-1')
                pdf.multi_cell(w=pdf.epw - 15, h=6, txt=f"- {safe_reason}", border=0, align='L')
                pdf.ln(2)
            pdf.ln(5)
            
            # ML
            pdf.set_font('helvetica', 'B', 14)
            pdf.set_text_color(30, 41, 59)
            pdf.set_fill_color(248, 250, 252)
            pdf.cell(w=pdf.epw, h=12, txt="  2. ANALYSE PREDICTIVE ML VS REALITE", border=1, ln=1, align='L', fill=True)
            pdf.ln(5)
            pdf.set_font('helvetica', '', 11)
            pdf.cell(w=pdf.epw, h=8, txt=f"Statut de Sante : {str(ml_status.get('status', 'N/A'))}", border=0, ln=1)
            prog_val = ml_status.get('progress', {}).get('percentage', 0) if isinstance(ml_status.get('progress'), dict) else 0
            pdf.cell(w=pdf.epw, h=8, txt=f"Progression Actuelle : {prog_val}%", border=0, ln=1)
            pdf.cell(w=pdf.epw, h=8, txt=f"Delai estime : {ml_status.get('delay_days', 0)} jours", border=0, ln=1)
            pdf.cell(w=pdf.epw, h=8, txt=f"Date de fin projetee : {str(ml_status.get('projected_end_date', 'N/A'))}", border=0, ln=1)
            pdf.ln(10)
            
            # Anomalies
            pdf.set_font('helvetica', 'B', 14)
            pdf.set_fill_color(239, 68, 68)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(w=pdf.epw, h=12, txt="  3. ANOMALIES CRITIQUES BLOQUANTES", border=1, ln=1, align='L', fill=True)
            pdf.set_text_color(30, 41, 59)
            pdf.ln(5)
            
            if not critical_anomalies.exists():
                pdf.set_font('helvetica', 'I', 11)
                pdf.cell(w=pdf.epw, h=8, txt="Aucune anomalie critique non resolue detectee.", border=0, ln=1)
            else:
                pdf.set_font('helvetica', 'B', 10)
                pdf.cell(30, 10, "ID", 1)
                pdf.cell(120, 10, "TITRE", 1)
                pdf.cell(40, 10, "STATUT", 1)
                pdf.ln()
                pdf.set_font('helvetica', '', 9)
                for an in critical_anomalies[:20]: # Show up to 20
                    safe_titre = str(an.titre).encode('latin-1', 'replace').decode('latin-1')
                    pdf.cell(30, 8, str(an.id), 1)
                    pdf.cell(120, 8, safe_titre[:65], 1)
                    pdf.cell(40, 8, str(an.statut), 1)
                    pdf.ln()

            # Signatures
            pdf.ln(15)
            pdf.set_font('helvetica', 'B', 10)
            
            # Simple centered signature for QA Manager only
            pdf.cell(w=pdf.epw, h=10, txt="SIGNATURE DU QA MANAGER / VALIDATEUR", border=0, ln=1, align='C')
            pdf.ln(20)
            pdf.set_font('helvetica', 'I', 8)
            pdf.cell(w=pdf.epw, h=10, txt="Document certifie automatiquement par la plateforme InsureTM.", border=0, ln=1, align='C')

            logger.info("PDF generation complete, returning response.")
            pdf_out = bytes(pdf.output())
            logger.info("PDF Size: %d bytes", len(pdf_out))
            response = HttpResponse(pdf_out, content_type='application/pdf')
            filename = f"fiche_cloture_{campaign.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.exception("FATAL ERROR in closure report")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class DashboardBriefView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Expects current stats from frontend to generate a brief.
        Alternatively, can compute them here. Let's compute some key ones for safety.
        """
        stats = request.data.get('stats', {})
        
        # Enrich stats with deep data
        from testCases.models import TestCase
        
        if not stats.get('total_campaigns'):
            stats['total_campaigns'] = Campaign.objects.count()
        if not stats.get('open_anomalies'):
            stats['open_anomalies'] = Anomalie.objects.exclude(statut='RESOLUE').count()
        
        stats['critical_impact_count'] = Anomalie.objects.filter(impact__in=['CRITIQUE', 'BLOQUANTES']).exclude(statut='RESOLUE').count()
        stats['total_passed'] = TestCase.objects.filter(status='PASSED').count()
        stats['total_failed'] = TestCase.objects.filter(status='FAILED').count()
        stats['total_executions'] = stats['total_passed'] + stats['total_failed']
        
        # Calculate an average readiness score for active campaigns
        active_campaigns = Campaign.objects.all().order_by('-created_at')[:5]
        readiness_manager = ReleaseReadinessManager()
        scores = []
        for c in active_campaigns:
             res = readiness_manager.calculate_readiness_score(campaign_id=c.id)
             if 'score' in res:
                 scores.append(res['score'])
        
        stats['readiness_score'] = int(sum(scores) / len(scores)) if scores else 0
        
        try:
            res = GroqService().generate_dashboard_brief(stats)
            return Response({
                'brief': res['brief'], 
                'target_id': res['target_id'],
                'readiness_score': stats['readiness_score']
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from .recommendation_service import CatchupRecommendationManager

# ... (rest of imports)

class CatchupPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        # Security check (Managers/Admins only for recommendations typically)
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)
            
        result = CatchupRecommendationManager().get_catchup_plan(campaign_id)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result)

    def post(self, request, campaign_id):
        # Security check
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)

        assignments = request.data.get('tester_ids', []) # On garde le nom mais c'est maintenant une liste d'objets ou d'IDs
        if not assignments:
            return Response({'error': 'Aucun testeur sélectionné.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            campaign = get_object_or_404(Campaign, id=campaign_id)
            
            # Traitement flexible : peut être une liste d'IDs ou une liste d'objets {tester_id, test_count}
            assigned_count = 0
            from campaigns.models import CampaignAssignment
            
            for item in assignments:
                if isinstance(item, dict):
                    t_id = item.get('tester_id')
                    count = item.get('test_count', 0)
                else:
                    t_id = item
                    count = 0

                if t_id:
                    # On utilise update_or_create pour gérer le quota spécifique au travers du modèle de jointure
                    CampaignAssignment.objects.update_or_create(
                        campaign=campaign,
                        tester_id=t_id,
                        defaults={'test_quota': count}
                    )
                    assigned_count += 1

            campaign.save()

            return Response({
                'status': 'success',
                'message': f"{assigned_count} testeurs ont été assignés avec succès à la campagne {campaign.title}."
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NotifyCatchupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, campaign_id):
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)
            
        tester_ids = request.data.get('tester_ids', [])
        if not tester_ids:
            return Response({'error': 'Aucun testeur sélectionné.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        testers = User.objects.filter(id__in=tester_ids)
        
        campaign = get_object_or_404(Campaign, id=campaign_id)
        
        tester_distribution = []
        for t in testers:
            tester_distribution.append({
                "tester_id": t.id,
                "tester_name": t.get_full_name() or t.username,
                "email": t.email,
                "ml_score": 100
            })
            
        plan_data = {
            "campaign_id": campaign.id,
            "campaign_title": campaign.title,
            "delay_days": 5,
            "tester_distribution": tester_distribution,
            "manager_email": request.user.email
        }
        
        from .recommendation_service import CatchupRecommendationManager
        success = CatchupRecommendationManager().send_to_n8n(plan_data)
        
        if success:
            # Track each notification in the DB
            from .models import ReinforcementNotification
            for t in testers:
                ReinforcementNotification.objects.update_or_create(
                    campaign=campaign,
                    tester=t,
                    defaults={'status': 'PENDING'}
                )
            return Response({'status': 'success', 'message': 'Notification envoyée à n8n.'})
        return Response({'error': "Erreur lors de l'envoi à n8n."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AcceptReinforcementView(APIView):
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]
    
    def post(self, request):
        # --- Token security check ---
        import os
        expected_token = os.environ.get('N8N_WEBHOOK_TOKEN', '')
        received_token = request.data.get('token') or request.query_params.get('token', '')
        if expected_token and received_token != expected_token:
            return Response({'error': 'Unauthorized: invalid token'}, status=status.HTTP_403_FORBIDDEN)

        campaign_id = request.data.get('campaign_id') or request.query_params.get('campaign_id')
        tester_id = request.data.get('tester_id') or request.query_params.get('tester_id')
        
        if not campaign_id or not tester_id:
            print("ERROR: Missing parameters")
            return Response({'error': 'Missing parameters'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from campaigns.models import Campaign, CampaignAssignment
            from django.utils import timezone
            campaign = get_object_or_404(Campaign, id=campaign_id)
            
            # Create or update the assignment
            CampaignAssignment.objects.update_or_create(
                campaign=campaign,
                tester_id=tester_id,
                defaults={'test_quota': 0}
            )

            # Update monitoring status → ACCEPTED
            from .models import ReinforcementNotification
            ReinforcementNotification.objects.filter(
                campaign=campaign, tester_id=tester_id
            ).update(status='ACCEPTED', replied_at=timezone.now())

            # Notify the manager (campaign.imported_by)
            manager = campaign.imported_by
            if manager:
                from notifications.models import Notification
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    tester = User.objects.get(id=tester_id)
                    Notification.objects.create(
                        recipient=manager,
                        title="Renfort Accepté",
                        message=f"{tester.get_full_name() or tester.username} a accepté votre demande de renfort pour la campagne : {campaign.title}",
                        type='info',
                        related_campaign=campaign
                    )
                except Exception as notif_err:
                    logger.error(f"Failed to create accepted reinforcement notification: {notif_err}")
            
            return Response({'status': 'success', 'message': f'Tester {tester_id} assigned to campaign {campaign_id}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class RefuseReinforcementView(APIView):
    """Called by n8n when a tester clicks 'Refuser' — updates status to REFUSED."""
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get(self, request):
        return self.post(request)

    def post(self, request):
        from django.utils import timezone
        campaign_id = request.data.get('campaign_id') or request.query_params.get('campaign_id')
        tester_id = request.data.get('tester_id') or request.query_params.get('tester_id')

        if not campaign_id or not tester_id:
            return Response({'error': 'Missing parameters'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from campaigns.models import Campaign
            campaign = get_object_or_404(Campaign, id=campaign_id)

            from .models import ReinforcementNotification
            updated = ReinforcementNotification.objects.filter(
                campaign=campaign, tester_id=tester_id
            ).update(status='REFUSED', replied_at=timezone.now())

            # Notify the manager (campaign.imported_by)
            manager = campaign.imported_by
            if manager:
                from notifications.models import Notification
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    tester = User.objects.get(id=tester_id)
                    Notification.objects.create(
                        recipient=manager,
                        title="Renfort Refusé",
                        message=f"{tester.get_full_name() or tester.username} a refusé votre demande de renfort pour la campagne : {campaign.title}",
                        type='info',
                        related_campaign=campaign
                    )
                except Exception as notif_err:
                    logger.error(f"Failed to create refused reinforcement notification: {notif_err}")

            return Response({'status': 'refused', 'updated': updated})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PendingReinforcementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'TESTER':
            return Response([])
            
        from .models import ReinforcementNotification
        pending = ReinforcementNotification.objects.filter(
            tester=request.user,
            status='PENDING'
        ).select_related('campaign')
        
        data = []
        for p in pending:
            data.append({
                'campaign_id': p.campaign.id,
                'campaign_title': p.campaign.title,
                'manager_email': 'manager@lloyd.com', # Default or fetch from campaign/owner
                'sent_at': p.sent_at.isoformat() if p.sent_at else None
            })
        return Response(data)

class RespondToN8NView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        campaign_id = request.data.get('campaign_id')
        statut = request.data.get('statut')
        manager_email = request.data.get('manager_email')
        tester_id = request.user.id
        
        import requests
        try:
            url = f"http://n8n:5678/webhook/reponse-testeur?statut={statut}&campaign_id={campaign_id}&tester_id={tester_id}&manager_email={manager_email}"
            # In docker, n8n is accessible via 'n8n' hostname, but locally it might be localhost
            try:
                requests.get(url, timeout=5)
            except requests.exceptions.ConnectionError:
                requests.get(f"http://localhost:5678/webhook/reponse-testeur?statut={statut}&campaign_id={campaign_id}&tester_id={tester_id}&manager_email={manager_email}", timeout=5)
            return Response({'status': 'success'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class N8NCreateNotificationView(APIView):
    """Called by n8n to push in-app notifications instead of sending emails."""
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]
    
    def post(self, request):
        import os
        expected_token = os.environ.get('N8N_WEBHOOK_TOKEN', '')
        received_token = request.data.get('token')
        if expected_token and received_token != expected_token:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        tester_id = request.data.get('tester_id')
        email = request.data.get('email')
        title = request.data.get('title')
        message = request.data.get('message')
        notif_type = request.data.get('type', 'info')
        campaign_id = request.data.get('campaign_id')
        
        from notifications.models import Notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            if tester_id:
                user = User.objects.get(id=tester_id)
            elif email:
                user = User.objects.get(email=email)
            else:
                return Response({'error': 'Missing user identifier'}, status=400)
                
            Notification.objects.create(
                recipient=user,
                title=title,
                message=message,
                type=notif_type,
                related_campaign_id=campaign_id
            )
            return Response({'status': 'success'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class ReinforcementStatusView(APIView):
    """Returns the reinforcement notification status for a campaign (for dashboard monitoring)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        from .models import ReinforcementNotification
        notifications = ReinforcementNotification.objects.filter(
            campaign_id=campaign_id
        ).select_related('tester')

        data = []
        for n in notifications:
            data.append({
                'tester_id':   n.tester.id,
                'tester_name': n.tester.get_full_name() or n.tester.username,
                'tester_email': n.tester.email,
                'status':      n.status,
                'sent_at':     n.sent_at.strftime('%d/%m %H:%M') if n.sent_at else None,
                'replied_at':  n.replied_at.strftime('%d/%m %H:%M') if n.replied_at else None,
            })

        summary = {
            'total':    len(data),
            'pending':  sum(1 for d in data if d['status'] == 'PENDING'),
            'accepted': sum(1 for d in data if d['status'] == 'ACCEPTED'),
            'refused':  sum(1 for d in data if d['status'] == 'REFUSED'),
        }
        return Response({'notifications': data, 'summary': summary})

class ApplyRecommendationActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action_id = request.data.get('action_id')
        campaign_id = request.data.get('campaign_id')
        
        if not action_id or not campaign_id:
            return Response({'error': 'Action ID and Campaign ID are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Mocking the application of actions for now as per requirements "actions applicables en un clic"
        # In a real scenario, this would trigger actual task re-assignment
        return Response({
            'status': 'success',
            'message': f"L'action {action_id} a été appliquée avec succès.",
            'applied_at': timezone.now()
        })

class HistoricalReleasesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            project_id = request.query_params.get('project_id')
            if project_id and project_id != 'all':
                campaigns = Campaign.objects.filter(project__business_project_id=project_id).order_by('created_at')
            else:
                campaigns = Campaign.objects.all().order_by('-created_at')[:10] # Top 10 récentes globalement
            
            data = []
            for camp in campaigns:
                tcs = TestCase.objects.filter(campaign=camp)
                # On utilise le count réel en base de préférence, ou nb_test_cases défini dans le modèle
                total = tcs.count() or camp.nb_test_cases
                passed = tcs.filter(status='PASSED').count()
                
                anomalies = Anomalie.objects.filter(test_case__campaign=camp).count()
                
                exec_dates = tcs.filter(execution_date__isnull=False).values_list('execution_date', flat=True)
                velocity = 0
                duration = 0
                if exec_dates:
                    start = min(exec_dates)
                    end = max(exec_dates)
                    duration = (end - start).days or 1
                    velocity = len(exec_dates) / duration
                
                if project_id and project_id != 'all':
                    version = camp.title or "N/A"
                else:
                    # En vue globale, on préfixe par l'initiale du projet pour plus de clarté
                    p_name = camp.project.name if camp.project else "PR"
                    version = f"{p_name[:3].upper()} - {camp.title or 'N/A'}"
                
                data.append({
                    "release_id": camp.id,
                    "version": version,
                    "pass_rate": round((passed / total * 100), 1) if total > 0 else 0,
                    "total_tests": total,
                    "avg_velocity": round(velocity, 1),
                    "anomaly_count": anomalies,
                    "duration_days": duration,
                    "completed_at": camp.estimated_end_date.isoformat() if camp.estimated_end_date else camp.created_at.isoformat()
                })
            return Response(data)
        except Exception as e:
            logger.exception("Error in HistoricalReleasesView")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistoricalTestersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            project_id = request.query_params.get('project_id')
            
            # Identification des testeurs ayant participé
            if project_id and project_id != 'all':
                testers = TestCase.objects.filter(campaign__project__business_project_id=project_id).values('tester').distinct()
            else:
                testers = TestCase.objects.all().values('tester').distinct()
            
            data = []
            from django.contrib.auth import get_user_model
            from .ml_service import MLTimelineGuard
            User = get_user_model()
            ml_guard = MLTimelineGuard()
            
            for t_dict in testers:
                tester_id = t_dict['tester']
                if not tester_id: continue
                try:
                    user = User.objects.get(id=tester_id)
                except User.DoesNotExist:
                    continue
                
                if project_id and project_id != 'all':
                    campaigns = Campaign.objects.filter(project_id=project_id).order_by('created_at')
                else:
                    campaigns = Campaign.objects.all().order_by('created_at')
                releases_perf = []
                for camp in campaigns:
                    tc_set = TestCase.objects.filter(campaign=camp, tester=user)
                    if not tc_set.exists(): continue
                    
                    executed_tc_set = tc_set.exclude(status='PENDING')
                    passed = executed_tc_set.filter(status='PASSED').count()
                    total = executed_tc_set.count()
                    
                    exec_dates = tc_set.filter(execution_date__isnull=False).values_list('execution_date', flat=True)
                    velocity = 0
                    if exec_dates:
                        start = min(exec_dates)
                        end = max(exec_dates)
                        dur = (end - start).days or 1
                        velocity = len(exec_dates) / dur
                    
                    version = camp.title.split()[-1] if camp.title and camp.title.split() else (camp.title or "N/A")
                    
                    releases_perf.append({
                        "version": version,
                        "pass_rate": round((passed / total * 100), 1) if total > 0 else 0,
                        "velocity": round(velocity, 1)
                    })
                
                if not releases_perf: continue
                
                latest = releases_perf[-1]['pass_rate']
                first = releases_perf[0]['pass_rate']
                delta = latest - first
                
                trend = 'stable'
                if delta > 5: trend = 'improving'
                elif delta < -5: trend = 'declining'
                
                ml_perf = ml_guard.score_tester(tester_id=user.id)
                
                name = user.get_full_name() or user.username
                initials = "".join([part[0] for part in name.split()[:2]]).upper()

                data.append({
                    "tester": {
                        "id": user.id, 
                        "name": name, 
                        "initials": initials
                    },
                    "releases": releases_perf,
                    "trend": trend,
                    "latest_pass_rate": latest,
                    "delta_vs_first": round(delta, 1),
                    "ml_score": ml_perf.get("score", 50),
                    "ml_label": ml_perf.get("label", "NEUTRAL"),
                    "ml_metrics": ml_perf.get("metrics", {})
                })
            return Response(data)
        except Exception as e:
            logger.exception("Error in HistoricalTestersView")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistoricalModulesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            project_id = request.query_params.get('project_id')
            
            if project_id and project_id != 'all':
                tcs = TestCase.objects.filter(campaign__project__business_project_id=project_id)
            else:
                tcs = TestCase.objects.all()
            
            modules = {}
            for tc in tcs:
                # Extraction du nom du module depuis le JSON
                data = tc.data_json or {}
                mod_name = "Core"
                if isinstance(data, dict):
                    mod_name = data.get('Module') or data.get('Domaine') or "Core"
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            found = item.get('Module') or item.get('Domaine')
                            if found:
                                mod_name = found
                                break
                
                if mod_name not in modules:
                    modules[mod_name] = {"fails": 0, "total": 0, "releases": set()}
                
                modules[mod_name]["total"] += 1
                if tc.status == 'FAILED':
                    modules[mod_name]["fails"] += 1
                modules[mod_name]["releases"].add(tc.campaign_id)
                
            data = []
            for name, stats in modules.items():
                total = stats["total"]
                fail_rate = round((stats["fails"] / total * 100), 1) if total > 0 else 0
                status_val = 'healthy'
                if fail_rate > 30: status_val = 'critical'
                elif fail_rate > 15: status_val = 'warning'
                
                data.append({
                    "module_name": name,
                    "tc_range": f"{total} tests",
                    "fail_rates": [fail_rate],
                    "avg_fail_rate": fail_rate,
                    "status": status_val,
                    "releases_affected": len(stats["releases"])
                })
            return Response(data)
        except Exception as e:
            logger.exception("Error in HistoricalModulesView")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QANewsListView(APIView):
    """View to list QA news and tips, with an option to trigger scraping."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import QANews
        from .scraping_service import QAScrapingService
        
        # Optionnel: scraper si on a moins de 3 news
        if QANews.objects.count() < 3:
            try:
                QAScrapingService().scrape_and_update()
            except Exception:
                pass
        news = QANews.objects.all().order_by('-created_at')[:50]
        data = []
        for n in news:
            data.append({
                'id': n.id,
                'title': n.title,
                'url': n.url,
                'source': n.source,
                'ai_tip': n.ai_tip,
                'created_at': n.created_at.strftime('%d/%m/%Y')
            })
        return Response(data)

    def delete(self, request):
        from .models import QANews
        news_id = request.query_params.get('id')
        if news_id:
            try:
                news = QANews.objects.get(id=news_id)
                news.delete()
                return Response({"message": "Article supprimé."})
            except QANews.DoesNotExist:
                return Response({"error": "Article non trouvé."}, status=404)
        return Response({"error": "ID requis."}, status=400)

    def post(self, request):
        """Manually trigger scraping."""
        from .scraping_service import QAScrapingService
        new_count = QAScrapingService().scrape_and_update()
        return Response({'status': 'success', 'new_items': new_count})

