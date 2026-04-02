from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .serializers import UserSerializer, UserRegistrationSerializer
from notifications.models import Notification
from utils.email_service import send_account_created_email

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        
        # Send Welcome Email
        if user.email:
            raw_password = getattr(user, '_raw_password', None)
            send_account_created_email(user, raw_password)
            
        # Notify ADMINs
        admins = User.objects.filter(role='ADMIN').exclude(id=user.id)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title="Nouveau Compte Utilisateur",
                message=f"Le compte {user.username} ({user.role}) a été créé.",
                type='info'
            )