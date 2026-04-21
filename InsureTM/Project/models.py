from django.db import models
from django.conf import settings

class Project(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Actif'),
        ('PLANNING', 'Planifié'),
        ('COMPLETED', 'Terminé'),
    ]

    name = models.CharField(max_length=200) # Ex: Release Q1 2024
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    
    
    business_project = models.ForeignKey(
        'business_projects.BusinessProject',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='releases',
        verbose_name="Projet Parent"
    )

    # Type de Release
    RELEASE_TYPE_CHOICES = [
        ('PREPROD', 'Préproduction'),
        ('RECETTE', 'Recette'),
    ]
    release_type = models.CharField(
        max_length=20, 
        choices=RELEASE_TYPE_CHOICES, 
        default='RECETTE',
        verbose_name="Type de Release"
    )

    # Créé par qui (Manager)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='managed_releases',
        verbose_name="Créé par"
    )

    def __str__(self):
        return self.name

    @property
    def campaign_count(self):
        return self.campaigns.count()