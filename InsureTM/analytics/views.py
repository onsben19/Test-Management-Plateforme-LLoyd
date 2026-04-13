import logging

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
from .groq_service import GroqService
from .ml_service import MLTimelineGuard
from .readiness_service import ReleaseReadinessManager
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

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

        image_file = request.FILES.get('image')
        Message.objects.create(
            conversation=conversation, 
            sender='user', 
            text=question, 
            type='text',
            image=image_file
        )

        try:
            result = GroqService().process_query(question, request.user, image=image_file)

            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text=result['answer'],
                type=result.get('type', 'text'),
                sql=result.get('sql', ''),
                data=result.get('data', []),
            )
            conversation.save()

            return Response({
                'answer': result['answer'],
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

        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reformulated = GroqService().reformulate_message(message, is_subject=is_subject)
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
                
            critical_anomalies = Anomalie.objects.filter(test_case__campaign=campaign, criticite='CRITIQUE').exclude(statut='RESOLUE')
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
                pdf.multi_cell(w=pdf.epw - 15, h=6, txt=f"- {str(reason)}", border=0, align='L')
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
                    pdf.cell(30, 8, str(an.id), 1)
                    pdf.cell(120, 8, str(an.titre)[:65], 1)
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
        
        stats['critical_anomalies'] = Anomalie.objects.filter(criticite='CRITIQUE').exclude(statut='RESOLUE').count()
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
