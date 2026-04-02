# Project/views.py
from rest_framework import viewsets
from django.db.models import Q
from .models import Project
from .serializers import ProjectSerializer
from django.contrib.auth import get_user_model
from notifications.models import Notification
from django.core.mail import send_mail
from django.conf import settings

def send_project_created_email(recipient, creator, project):
    subject = f"[InsureTM] Nouveau projet créé : {project.name}"
    message = f"""Bonjour {recipient.first_name or recipient.username},

Un nouveau projet vient d'être créé sur la plateforme InsureTM par {creator.username}.

  Projet : {project.name}
  Statut : {project.status}

Connectez-vous pour voir les détails.
"""
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient.email], fail_silently=True)

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = Project.objects.all()
        search = self.request.query_params.get('search', None)
        status = self.request.query_params.get('status', None)

        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))
        
        if status and status != 'ALL':
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        
        # Notify all ADMINs
        User = get_user_model()
        admins = User.objects.filter(role='ADMIN').exclude(id=self.request.user.id)
        
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title="Nouveau Projet",
                message=f"{self.request.user.username} a créé le projet : {instance.name}",
                type='info'
            )
            if admin.email:
                send_project_created_email(admin, self.request.user, instance)