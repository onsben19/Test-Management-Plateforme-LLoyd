from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserRegistrationSerializer
User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        # Utilise le serializer d'inscription pour les requêtes POST
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        # Permet de filtrer par rôle dans Postman : ?role=TESTER
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset