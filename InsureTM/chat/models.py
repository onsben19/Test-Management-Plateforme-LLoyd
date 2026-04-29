from django.db import models
from django.conf import settings

class Conversation(models.Model):
    CONV_TYPES = [
        ('DIRECT', 'Direct Message'),
        ('GROUP', 'Group Chat'),
    ]
    name = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=10, choices=CONV_TYPES, default='DIRECT')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.type == 'DIRECT':
            return f"Private chat ({self.id})"
        return self.name or f"Group {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg by {self.author} at {self.created_at}"
