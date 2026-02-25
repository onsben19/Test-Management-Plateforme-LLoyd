from rest_framework import serializers
from .models import Comment

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    attachment_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'test_case', 'author_name', 'message', 'attachment', 'attachment_name', 'created_at']

    def get_attachment_name(self, obj):
        if obj.attachment:
            return obj.attachment.name.split('/')[-1]
        return None
