from django.db import models
from django.conf import settings

class BusinessProject(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom du Projet")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de Création")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='business_projects',
        verbose_name="Créé par"
    )

    class Meta:
        verbose_name = "Projet Business"
        verbose_name_plural = "Projets Business"

    def __str__(self):
        return self.name
