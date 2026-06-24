from rest_framework import serializers
from .models import Conversation, Message, ConversationReadCursor
from django.contrib.auth import get_user_model

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']

class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'author', 'author_name', 'text', 'attachment',
            'is_edited', 'created_at', 'updated_at', 'is_read',
        ]
        read_only_fields = ['author', 'created_at', 'updated_at', 'author_name', 'is_read']

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if obj.author_id != request.user.id:
            return None
        others = obj.conversation.participants.exclude(id=obj.author_id)
        if not others.exists():
            return False
        for user in others:
            cursor = ConversationReadCursor.objects.filter(
                conversation=obj.conversation, user=user
            ).first()
            if not cursor or not cursor.last_read_message_id:
                return False
            if cursor.last_read_message_id < obj.id:
                return False
        return True

class ConversationSerializer(serializers.ModelSerializer):
    participants_details = UserMinimalSerializer(source='participants', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'name', 'type', 'participants', 'participants_details',
            'last_message', 'unread_count', 'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return MessageSerializer(last, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        cursor = ConversationReadCursor.objects.filter(
            conversation=obj, user=request.user
        ).first()
        qs = obj.messages.exclude(author=request.user)
        if cursor and cursor.last_read_message_id:
            qs = qs.filter(id__gt=cursor.last_read_message_id)
        return qs.count()
