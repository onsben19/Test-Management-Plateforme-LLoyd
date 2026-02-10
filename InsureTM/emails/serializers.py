from rest_framework import serializers
from .models import Email

class EmailSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    recipient_name = serializers.ReadOnlyField(source='recipient.username')

    class Meta:
        model = Email
        fields = ['id', 'sender', 'sender_name', 'recipient', 'recipient_name', 'subject', 'body', 'attachment', 'created_at', 'is_read']
        read_only_fields = ['sender', 'created_at', 'is_read']
