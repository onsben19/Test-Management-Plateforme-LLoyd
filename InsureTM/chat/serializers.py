from rest_framework import serializers
from .models import Conversation, Message
from django.contrib.auth import get_user_model

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']

class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'author', 'author_name', 'text', 'attachment', 'is_edited', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at', 'author_name']

class ConversationSerializer(serializers.ModelSerializer):
    participants_details = UserMinimalSerializer(source='participants', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'name', 'type', 'participants', 'participants_details', 'last_message', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return MessageSerializer(last).data
        return None
