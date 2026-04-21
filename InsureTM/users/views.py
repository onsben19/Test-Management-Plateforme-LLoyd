from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q

from .serializers import UserSerializer, UserRegistrationSerializer
from notifications.models import Notification
from utils.email_service import send_account_created_email, send_otp_email, send_password_reset_email
from django.utils import timezone
from datetime import timedelta
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
            
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() in ['true', '1', 't', 'y', 'yes']
            queryset = queryset.filter(is_active=is_active)
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
            
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


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response({"detail": "Identifiants invalides"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = serializer.user
        
        # Générer OTP à 6 chiffres
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        user.otp_code = otp
        user.otp_expiry = timezone.now() + timedelta(minutes=5)
        user.save()
        
        # Envoyer l'email
        send_otp_email(user, otp)
        
        return Response({
            "requires_2fa": True,
            "username": user.username,
            "message": "Un code de vérification a été envoyé par email."
        }, status=status.HTTP_200_OK)


class Verify2FAView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        otp = request.data.get('otp')
        
        if not username or not otp:
            return Response({"detail": "Nom d'utilisateur et code OTP requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
        # Vérification OTP
        if user.otp_code != otp:
             return Response({"detail": "Code OTP invalide"}, status=status.HTTP_401_UNAUTHORIZED)
             
        if user.otp_expiry < timezone.now():
             return Response({"detail": "Code OTP expiré"}, status=status.HTTP_401_UNAUTHORIZED)
             
        # Reset OTP fields
        user.otp_code = None
        user.otp_expiry = None
        user.save()
        
        # Générer Tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        identifier = request.data.get('identifier')
        if not identifier:
            return Response({"detail": "Identifiant requis (email ou nom d'utilisateur)"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Recherche par email ou username (premier match)
            user = User.objects.filter(Q(email=identifier) | Q(username=identifier)).first()
            if not user:
                return Response({"message": "Si votre compte existe, un nouveau mot de passe vous a été envoyé."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "Si votre compte existe, un nouveau mot de passe vous a été envoyé."}, status=status.HTTP_200_OK)
        
        # Générer nouveau mot de passe
        new_pwd = User.generate_random_password(length=12)
        user.set_password(new_pwd)
        user.save()
        
        # Envoyer l'email
        send_password_reset_email(user, new_pwd)
        
        return Response({"message": "Si votre compte existe, un nouveau mot de passe vous a été envoyé."}, status=status.HTTP_200_OK)