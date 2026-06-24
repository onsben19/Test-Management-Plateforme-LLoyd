from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, Message, ConversationReadCursor
from .serializers import ConversationSerializer, MessageSerializer
from django.db.models import Q

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).distinct().order_by('-updated_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        participants_ids = self.request.data.get('participants', [])
        if self.request.user.id not in participants_ids:
            participants_ids.append(self.request.user.id)

        instance = serializer.save()
        instance.participants.set(participants_ids)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        conv = self.get_object()
        last_message_id = request.data.get('last_message_id')

        if last_message_id:
            last_msg = Message.objects.filter(conversation=conv, id=last_message_id).first()
        else:
            last_msg = conv.messages.order_by('-id').first()

        if not last_msg:
            return Response({'status': 'ok', 'last_read_message_id': None})

        ConversationReadCursor.objects.update_or_create(
            conversation=conv,
            user=request.user,
            defaults={'last_read_message': last_msg},
        )

        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'global_chat',
            {
                'type': 'chat_read',
                'conversation_id': str(conv.id),
                'reader_id': request.user.id,
                'last_read_message_id': last_msg.id,
            },
        )

        return Response({'status': 'ok', 'last_read_message_id': last_msg.id})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.request.query_params.get('conversation')
        queryset = Message.objects.filter(conversation__participants=self.request.user)
        if conv_id:
            queryset = queryset.filter(conversation_id=conv_id)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def _broadcast(self, event_type, conv, payload=None, extra=None):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        event = {
            'type': event_type,
            'conversation_id': str(conv.id),
        }
        if payload is not None:
            event['payload'] = payload
        if extra:
            event.update(extra)
        async_to_sync(channel_layer.group_send)('global_chat', event)

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        conv = instance.conversation
        conv.save()

        payload = MessageSerializer(instance, context={'request': self.request}).data
        self._broadcast('chat_message', conv, payload=payload)

        import re
        from django.contrib.auth import get_user_model
        User = get_user_model()

        usernames = re.findall(r'@(\w+)', instance.text or '')
        mentioned_users = User.objects.filter(username__in=usernames)

        for user in mentioned_users:
            if user == self.request.user:
                continue
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'global_chat',
                {
                    'type': 'chat_mention',
                    'target_user_id': user.id,
                    'author_name': self.request.user.username,
                    'text': instance.text,
                },
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        payload = MessageSerializer(instance, context={'request': self.request}).data
        self._broadcast('chat_message_update', instance.conversation, payload=payload)

    def perform_destroy(self, instance):
        conv = instance.conversation
        msg_id = instance.id
        instance.delete()
        self._broadcast('chat_message_delete', conv, extra={'message_id': msg_id})

    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        msg = self.get_object()
        target_conv_id = request.data.get('target_conversation')
        if not target_conv_id:
            return Response({'error': 'target_conversation is required'}, status=status.HTTP_400_BAD_REQUEST)

        target_conv = Conversation.objects.get(id=target_conv_id, participants=request.user)
        new_msg = Message.objects.create(
            conversation=target_conv,
            author=request.user,
            text=f'[Transféré de {msg.author.username}] {msg.text}',
            attachment=msg.attachment,
        )
        target_conv.save()
        payload = MessageSerializer(new_msg, context={'request': self.request}).data
        self._broadcast('chat_message', target_conv, payload=payload)
        return Response(payload, status=status.HTTP_201_CREATED)
