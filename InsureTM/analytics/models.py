from django.db import models
from django.conf import settings
import uuid

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='analytics_conversations')
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Conversation {self.created_at}"

class Message(models.Model):
    SENDER_CHOICES = (
        ('user', 'User'),
        ('agent', 'Agent'),
    )
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    text = models.TextField()
    
    # Metadata for rich responses
    type = models.CharField(max_length=20, default='text') # text, bar, line, table, metric, error
    sql = models.TextField(blank=True, null=True)
    data = models.JSONField(default=list, blank=True)
    file = models.FileField(upload_to='analytics_files/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender}: {self.text[:50]}..."


class ReinforcementNotification(models.Model):
    """Tracks reinforcement email notifications sent via n8n."""

    STATUS_CHOICES = [
        ('PENDING',  'En attente'),
        ('ACCEPTED', 'Accepté'),
        ('REFUSED',  'Refusé'),
    ]

    campaign   = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.CASCADE,
        related_name='reinforcement_notifications'
    )
    tester     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reinforcement_notifications'
    )
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    sent_at    = models.DateTimeField(auto_now_add=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']
        unique_together = ('campaign', 'tester')

    def __str__(self):
        return f"{self.tester.username} -> Campagne {self.campaign_id} : {self.status}"

class QANews(models.Model):
    """Stores scraped QA articles and AI-generated tips."""
    title = models.CharField(max_length=255)
    url = models.URLField(unique=True)
    source = models.CharField(max_length=100, default='Ministry of Testing')
    content_summary = models.TextField()
    ai_tip = models.TextField(blank=True, null=True)
    published_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
