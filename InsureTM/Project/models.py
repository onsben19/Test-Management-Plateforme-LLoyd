from django.db import models
from django.conf import settings

class Project(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Terminé'),
        ('ARCHIVED', 'Archivé'),
    ]

    name = models.CharField(max_length=200) # Ex: Release Q1 2024
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Extended metadata from Conversation 922e2981
    problem_statement = models.TextField(blank=True, null=True)
    features = models.JSONField(blank=True, default=list)
    technologies = models.JSONField(blank=True, default=list)
    gantt_data = models.TextField(blank=True, null=True)
    
    # Créé par qui (Manager)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='releases'
    )

    def __str__(self):
        return self.name

    @property
    def campaign_count(self):
        return self.campaigns.count()