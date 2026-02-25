import logging

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from campaigns.models import Campaign
from .groq_service import GroqService
from .ml_service import MLTimelineGuard
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

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

        Message.objects.create(conversation=conversation, sender='user', text=question, type='text')

        try:
            result = GroqService().process_query(question, request.user)

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
