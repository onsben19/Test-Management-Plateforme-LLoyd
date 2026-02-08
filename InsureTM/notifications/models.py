from django.db import models
from django.conf import settings
from campaigns.models import Campaign

class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=50, default='info') # e.g., 'campaign_assignment', 'execution_update'
    related_campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True)
    related_object_id = models.IntegerField(null=True, blank=True) # ID of the related object (Execution, Anomaly, etc.)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
