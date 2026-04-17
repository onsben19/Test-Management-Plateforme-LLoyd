from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.db.models import Q

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).distinct().order_by('-updated_at')

    def perform_create(self, serializer):
        participants_ids = self.request.data.get('participants', [])
        # Ensure current user is in participants
        if self.request.user.id not in participants_ids:
            participants_ids.append(self.request.user.id)
        
        instance = serializer.save()
        instance.participants.set(participants_ids)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.request.query_params.get('conversation')
        queryset = Message.objects.filter(conversation__participants=self.request.user)
        if conv_id:
            queryset = queryset.filter(conversation_id=conv_id)
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        # Update conversation timestamp
        conv = instance.conversation
        conv.save() # Triggers auto_now=True for updated_at

        # Broadcast message via Channels
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        
        payload = MessageSerializer(instance).data
        async_to_sync(channel_layer.group_send)(
            "global_chat",
            {
                "type": "chat_message",
                "conversation_id": str(conv.id),
                "payload": payload
            }
        )

        # Detect mentions and broadcast notifications
        import re
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        usernames = re.findall(r'@(\w+)', instance.text)
        mentioned_users = User.objects.filter(username__in=usernames)
        
        for user in mentioned_users:
            if user == self.request.user:
                continue
            async_to_sync(channel_layer.group_send)(
                "global_chat",
                {
                    "type": "chat_mention",
                    "target_user_id": user.id,
                    "author_name": self.request.user.username,
                    "text": instance.text
                }
            )

    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        msg = self.get_object()
        target_conv_id = request.data.get('target_conversation')
        if not target_conv_id:
            return Response({"error": "target_conversation is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        target_conv = Conversation.objects.get(id=target_conv_id, participants=request.user)
        new_msg = Message.objects.create(
            conversation=target_conv,
            author=request.user,
            text=f"[Transféré de {msg.author.username}] {msg.text}",
            attachment=msg.attachment
        )
        return Response(MessageSerializer(new_msg).data, status=status.HTTP_201_CREATED)
