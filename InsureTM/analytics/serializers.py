from rest_framework import serializers
from .models import Conversation, Message, SavedVisualization

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'type', 'sql', 'data', 'file', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'user', 'user_name', 'title', 'created_at', 'updated_at']


class SavedVisualizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedVisualization
        fields = ['id', 'user', 'title', 'query', 'sql', 'type', 'data', 'created_at']
        read_only_fields = ['user']
