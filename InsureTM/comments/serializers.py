from rest_framework import serializers
from .models import Comment

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    recipient_name = serializers.ReadOnlyField(source='recipient.username')
    attachment_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'test_case', 'recipient', 'recipient_name', 'author', 'author_name', 'message', 'attachment', 'attachment_name', 'created_at', 'updated_at']
        read_only_fields = ['author', 'author_name', 'recipient_name', 'created_at', 'updated_at']

    def get_attachment_name(self, obj):
        if obj.attachment:
            return obj.attachment.name.split('/')[-1]
        return None
