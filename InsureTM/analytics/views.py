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
            # Construire l'historique de la conversation pour le contexte du chatbot (exclure le système et construire messages)
            messages = [{"role": "system", "content": """Tu es un assistant IA général et polyvalent.
Ton objectif est de répondre à n'importe quelle question posée par l'utilisateur.

TES MISSIONS ET RÈGLES :
1. **Formatage Strict :** Utilise systématiquement le **Markdown** pour structurer tes réponses. Mets en gras les termes clés, utilise des listes à puces pour énumérer des idées, et intègre des blocs de code pour tout aspect technique.
2. **Concision et Clarté :** Sois direct et utile. Tes réponses doivent être claires et pertinentes.
3. **Polyvalence Totale :** Tu réponds de manière générale, sans être limité à une base de données ou un domaine précis.
4. **Langue :** Tu t'exprimes en Français par défaut, de manière chaleureuse et professionnelle."""}]

            # Fetch recent messages (excluding the system message we will insert, but fetching recent ones)
            # Fetch up to 10 messages of this conversation
            recent_msgs = conversation.messages.all().order_by('created_at')[:10]
            for msg in recent_msgs:
                if msg.sender == 'user':
                    messages.append({"role": "user", "content": msg.text})
                elif msg.sender == 'agent':
                    messages.append({"role": "assistant", "content": msg.text})

            from analytics.groq_service import GroqService
            groq = GroqService()
            result = groq.process_query(
                question=question,
                user=request.user,
                uploaded_file=uploaded_file,
                history=messages
            )

            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text=result.get('answer', ''),
                type=result.get('type', 'text'),
                sql=result.get('sql', ''),
                data=result.get('data', []),
            )
            conversation.save()

            return Response({
                'answer': result.get('answer', ''),
                'data': result.get('data', []),
                'sql': result.get('sql', ''),
                'type': result.get('type', 'text'),
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
        if not vis.sql or not vis.sql.strip():
            return Response({'error': 'Aucune requête SQL enregistrée pour cette visualisation.'},
                            status=status.HTTP_400_BAD_REQUEST)

        groq = GroqService()
        try:
            raw_data = groq.execute_query(vis.sql)
        except Exception as e:
            logger.exception("SQL refresh failed for saved visualization %s", vis.id)
            return Response({'error': f'Erreur SQL : {e}'}, status=status.HTTP_400_BAD_REQUEST)

        if vis.type == 'plotly':
            vis.data = groq.refresh_plotly_data(vis.data, raw_data, vis.title)
        else:
            vis.data = raw_data

        vis.save()
        return Response(self.get_serializer(vis).data)


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
        is_chat = request.data.get('is_chat', False)
        is_email = request.data.get('is_email', False)

        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reformulated = GroqService().reformulate_message(
                message,
                is_subject=is_subject,
                is_test_steps=is_test_steps,
                is_chat=is_chat,
                is_email=is_email,
            )
            return Response({'reformulated_message': reformulated})
        except Exception as e:
            logger.exception("Error reformulating message for user %s", request.user.username)
            err_msg = str(e)
            if '429' in err_msg or 'quota' in err_msg.lower() or 'rate' in err_msg.lower():
                return Response({
                    'error': 'quota_exceeded',
                    'message': "Les quotas journaliers des APIs IA sont épuisés. Réessayez demain."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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

    # Cache TTL matches the 5-minute theme rotation in generate_dashboard_brief
    CACHE_TTL = 300  # seconds

    def post(self, request):
        """
        Expects current stats from frontend to generate a brief.
        Result is cached for 5 minutes to avoid consuming AI quota on every page load.
        """
        from django.core.cache import cache
        from testCases.models import TestCase

        stats = request.data.get('stats', {})

        # Enrich stats with live DB data
        if not stats.get('total_campaigns'):
            stats['total_campaigns'] = Campaign.objects.count()
        if not stats.get('open_anomalies'):
            stats['open_anomalies'] = Anomalie.objects.exclude(statut='RESOLUE').count()

        stats['critical_impact_count'] = Anomalie.objects.filter(
            impact__in=['CRITIQUE', 'BLOQUANTES']
        ).exclude(statut='RESOLUE').count()
        stats['total_passed'] = TestCase.objects.filter(status='PASSED').count()
        stats['total_failed'] = TestCase.objects.filter(status='FAILED').count()
        stats['total_executions'] = stats['total_passed'] + stats['total_failed']

        active_campaigns = Campaign.objects.all().order_by('-created_at')[:5]
        readiness_manager = ReleaseReadinessManager()
        scores = [
            res['score']
            for c in active_campaigns
            for res in [readiness_manager.calculate_readiness_score(campaign_id=c.id)]
            if 'score' in res
        ]
        stats['readiness_score'] = int(sum(scores) / len(scores)) if scores else 0

        # Use a 5-min cache key (same rotation window as the AI theme)
        import time
        theme_slot = int(time.time() / self.CACHE_TTL)
        cache_key = f"dashboard_brief_{theme_slot}"
        cached = cache.get(cache_key)
        if cached:
            cached['readiness_score'] = stats['readiness_score']
            return Response(cached)

        try:
            res = GroqService().generate_dashboard_brief(stats)
            payload = {
                'brief': res['brief'],
                'target_id': res['target_id'],
                'readiness_score': stats['readiness_score'],
            }
            cache.set(cache_key, payload, timeout=self.CACHE_TTL)
            return Response(payload)
        except Exception as e:
            err_msg = str(e)
            if '429' in err_msg or 'quota' in err_msg.lower() or 'rate' in err_msg.lower():
                return Response({'error': 'quota_exceeded', 'message': 'Quotas IA épuisés.'}, status=503)
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
        
        from .ml_service import MLTimelineGuard
        ml_guard = MLTimelineGuard()
        ml_status = ml_guard.get_campaign_status(campaign.id, generate_insight=False)
        real_delay_days = ml_status.get('delay_days', 0) if isinstance(ml_status, dict) else 0

        tester_distribution = []
        for t in testers:
            tester_score_data = ml_guard.score_tester(t.id)
            ml_score = tester_score_data.get('score', 0) if isinstance(tester_score_data, dict) else 0
            tester_distribution.append({
                "tester_id": t.id,
                "tester_name": t.get_full_name() or t.username,
                "email": t.email,
                "ml_score": ml_score
            })

        plan_data = {
            "campaign_id": campaign.id,
            "campaign_title": campaign.title,
            "delay_days": real_delay_days,
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

    def get(self, request):
        """n8n sends a GET when the tester clicks the accept link in the email."""
        return self.post(request)

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
                'manager_email': p.campaign.imported_by.email if p.campaign.imported_by else '',
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
        from django.conf import settings as django_settings
        n8n_base = getattr(django_settings, 'N8N_BASE_URL', 'https://n8n.insuretb.tech')
        try:
            url = f"{n8n_base}/webhook/reponse-testeur?statut={statut}&campaign_id={campaign_id}&tester_id={tester_id}&manager_email={manager_email}"
            requests.get(url, timeout=5)
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
    CACHE_TTL = 120
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 50

    @staticmethod
    def _pass_rate(release_id, tc_map, planned_map):
        s = tc_map.get(release_id, {})
        passed = s.get('passed', 0)
        failed = s.get('failed', 0)
        executed = passed + failed
        return round((passed / executed * 100), 1) if executed > 0 else 0

    @staticmethod
    def _build_release_row(release, tc_map, planned_map, anomaly_map, project_id):
        s = tc_map.get(release.id, {})
        db_total = s.get('total', 0)
        total = max(db_total, planned_map.get(release.id, 0))
        passed = s.get('passed', 0)
        failed = s.get('failed', 0)
        executed = passed + failed
        duration = 0
        velocity = 0
        if s.get('min_date') and s.get('max_date'):
            duration = (s['max_date'] - s['min_date']).days or 1
            velocity = executed / duration

        if project_id and project_id != 'all':
            version = release.name or 'N/A'
        else:
            bp_name = release.business_project.name if release.business_project else 'Global'
            version = f"{bp_name} > {release.name or 'N/A'}"

        return {
            "release_id": release.id,
            "version": version,
            "pass_rate": HistoricalReleasesView._pass_rate(release.id, tc_map, planned_map),
            "coverage_rate": round((executed / total * 100), 1) if total > 0 else 0,
            "total_tests": total,
            "avg_velocity": round(velocity, 1),
            "anomaly_count": anomaly_map.get(release.id, 0),
            "duration_days": duration,
            "completed_at": release.created_at.isoformat(),
        }

    def get(self, request):
        from django.core.cache import cache
        from django.db.models import Count, Q, Min, Max, Sum
        from Project.models import Project

        project_id = request.query_params.get('project_id')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(
            int(request.query_params.get('page_size', self.DEFAULT_PAGE_SIZE)),
            self.MAX_PAGE_SIZE,
        )
        cache_key = f"hist_releases_v3_{project_id or 'all'}_p{page}_ps{page_size}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        try:
            releases_qs = Project.objects.select_related('business_project')
            if project_id and project_id != 'all':
                releases_qs = releases_qs.filter(business_project_id=project_id)

            ordered_qs = releases_qs.order_by('-created_at')
            total_count = ordered_qs.count()
            if total_count == 0:
                payload = {
                    "count": 0,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": 0,
                    "summary": {"stable_percent": 0, "trend_delta": None, "stable_releases": 0},
                    "results": [],
                }
                cache.set(cache_key, payload, timeout=self.CACHE_TTL)
                return Response(payload)

            all_release_ids = list(ordered_qs.values_list('id', flat=True))
            offset = (page - 1) * page_size
            page_releases = list(ordered_qs[offset:offset + page_size])
            page_release_ids = [r.id for r in page_releases]

            tc_stats = (
                TestCase.objects
                .filter(campaign__project_id__in=all_release_ids)
                .values('campaign__project_id')
                .annotate(
                    total=Count('id'),
                    passed=Count('id', filter=Q(status='PASSED')),
                    failed=Count('id', filter=Q(status='FAILED')),
                    min_date=Min('execution_date'),
                    max_date=Max('execution_date'),
                )
            )
            tc_map = {r['campaign__project_id']: r for r in tc_stats}

            planned_stats = (
                Campaign.objects
                .filter(project_id__in=all_release_ids)
                .values('project_id')
                .annotate(planned=Sum('nb_test_cases'))
            )
            planned_map = {r['project_id']: r['planned'] or 0 for r in planned_stats}

            anomaly_stats = (
                Anomalie.objects
                .filter(test_case__campaign__project_id__in=all_release_ids)
                .values('test_case__campaign__project_id')
                .annotate(cnt=Count('id'))
            )
            anomaly_map = {r['test_case__campaign__project_id']: r['cnt'] for r in anomaly_stats}

            pass_rates_newest_first = [
                self._pass_rate(rid, tc_map, planned_map) for rid in all_release_ids
            ]
            stable_releases = sum(1 for p in pass_rates_newest_first if p >= 80)
            stable_percent = round((stable_releases / total_count) * 100) if total_count else 0

            trend_delta = None
            if len(pass_rates_newest_first) >= 2:
                chronological = list(reversed(pass_rates_newest_first))
                deltas = [
                    chronological[i + 1] - chronological[i]
                    for i in range(len(chronological) - 1)
                ]
                trend_delta = round(sum(deltas) / len(deltas), 1)

            results = [
                self._build_release_row(r, tc_map, planned_map, anomaly_map, project_id)
                for r in page_releases
            ]

            total_pages = (total_count + page_size - 1) // page_size
            payload = {
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "summary": {
                    "stable_percent": stable_percent,
                    "stable_releases": stable_releases,
                    "trend_delta": trend_delta,
                },
                "results": results,
            }
            cache.set(cache_key, payload, timeout=self.CACHE_TTL)
            return Response(payload)
        except Exception as e:
            logger.exception("Error in HistoricalReleasesView")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistoricalTestersView(APIView):
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 120

    def get(self, request):
        from django.core.cache import cache
        from django.db.models import Count, Q, Min, Max
        from django.contrib.auth import get_user_model
        from .ml_service import MLTimelineGuard

        project_id = request.query_params.get('project_id')
        cache_key = f"hist_testers_{project_id or 'all'}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            User = get_user_model()
            base_qs = TestCase.objects.exclude(status='PENDING')
            if project_id and project_id != 'all':
                base_qs = base_qs.filter(campaign__project__business_project_id=project_id)

            # Single aggregated query: group by (tester, campaign)
            agg = (base_qs
                   .values('tester_id', 'campaign_id', 'campaign__title')
                   .annotate(
                       passed=Count('id', filter=Q(status='PASSED')),
                       total=Count('id'),
                       min_date=Min('execution_date'),
                       max_date=Max('execution_date'),
                   )
                   .order_by('tester_id', 'campaign__created_at'))

            # Group results by tester
            from collections import defaultdict
            tester_map = defaultdict(list)
            for row in agg:
                if not row['tester_id']:
                    continue
                velocity = 0
                if row['min_date'] and row['max_date']:
                    dur = (row['max_date'] - row['min_date']).days or 1
                    velocity = row['total'] / dur
                title = row['campaign__title'] or 'N/A'
                version = title.split()[-1] if title.split() else title
                tester_map[row['tester_id']].append({
                    "version": version,
                    "pass_rate": round((row['passed'] / row['total'] * 100), 1) if row['total'] > 0 else 0,
                    "velocity": round(velocity, 1),
                })

            tester_ids = list(tester_map.keys())
            users = {u.id: u for u in User.objects.filter(id__in=tester_ids)}
            ml_guard = MLTimelineGuard()

            data = []
            for tester_id, releases_perf in tester_map.items():
                user = users.get(tester_id)
                if not user or not releases_perf:
                    continue
                latest = releases_perf[-1]['pass_rate']
                first = releases_perf[0]['pass_rate']
                delta = latest - first
                trend = 'stable'
                if delta > 5: trend = 'improving'
                elif delta < -5: trend = 'declining'

                ml_perf = ml_guard.score_tester(tester_id=tester_id)
                name = user.get_full_name() or user.username
                initials = "".join([p[0] for p in name.split()[:2]]).upper()

                data.append({
                    "tester": {"id": tester_id, "name": name, "initials": initials},
                    "releases": releases_perf,
                    "trend": trend,
                    "latest_pass_rate": latest,
                    "delta_vs_first": round(delta, 1),
                    "ml_score": ml_perf.get("score", 50),
                    "ml_label": ml_perf.get("label", "NEUTRAL"),
                    "ml_metrics": ml_perf.get("metrics", {}),
                })
            cache.set(cache_key, data, timeout=self.CACHE_TTL)
            return Response(data)
        except Exception as e:
            logger.exception("Error in HistoricalTestersView")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistoricalModulesView(APIView):
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 180

    def get(self, request):
        from django.core.cache import cache
        from django.db.models import Count, Q

        project_id = request.query_params.get('project_id')
        cache_key = f"hist_modules_{project_id or 'all'}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            if project_id and project_id != 'all':
                qs = TestCase.objects.filter(campaign__project__business_project_id=project_id)
            else:
                qs = TestCase.objects.all()

            # Only fetch the fields we need — avoids loading heavy data_json blobs
            rows = qs.only('id', 'status', 'campaign_id', 'data_json').iterator(chunk_size=500)

            modules: dict = {}
            for tc in rows:
                raw = tc.data_json or {}
                mod_name = "Core"
                if isinstance(raw, dict):
                    mod_name = raw.get('Module') or raw.get('Domaine') or "Core"
                elif isinstance(raw, list):
                    for item in raw:
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

            result = []
            for name, stats in modules.items():
                total = stats["total"]
                fail_rate = round((stats["fails"] / total * 100), 1) if total > 0 else 0
                status_val = 'critical' if fail_rate > 30 else 'warning' if fail_rate > 15 else 'healthy'
                result.append({
                    "module_name": name,
                    "tc_range": f"{total} tests",
                    "fail_rates": [fail_rate],
                    "avg_fail_rate": fail_rate,
                    "status": status_val,
                    "releases_affected": len(stats["releases"]),
                })
            cache.set(cache_key, result, timeout=self.CACHE_TTL)
            return Response(result)
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

