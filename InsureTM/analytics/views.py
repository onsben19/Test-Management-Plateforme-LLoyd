from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

from .groq_service import GroqService
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

class AskAgentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('query')
        conversation_id = request.data.get('conversation_id')
        
        if not question:
            return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Manage Conversation
        if conversation_id:
            conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        else:
            conversation = Conversation.objects.create(
                user=request.user, 
                title=question[:50] + "..." if len(question) > 50 else question
            )

        # 2. Save User Message
        Message.objects.create(
            conversation=conversation,
            sender='user',
            text=question,
            type='text'
        )

        try:
            # 3. Get AI Response
            groq_service = GroqService()
            result = groq_service.process_query(question)
            
            # 4. Save Agent Message
            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text=result['answer'],
                type=result.get('type', 'text'),
                # Ensure sql and data are saved if present
                sql=result.get('sql', ''),
                data=result.get('data', [])
            )
            
            # Update conversation timestamp
            conversation.save()

            return Response({
                'answer': result['answer'],
                'data': result.get('data', []),
                'sql': result.get('sql', ''),
                'type': result.get('type', 'text'),
                'conversation_id': conversation.id,
                'conversation_title': conversation.title
            })

        except Exception as e:
            # Save error message if needed, or just return error
            Message.objects.create(
                conversation=conversation,
                sender='agent',
                text="Désolé, une erreur est survenue.",
                type='error'
            )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
