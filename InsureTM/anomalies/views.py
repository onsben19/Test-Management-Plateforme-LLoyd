# views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Anomalie
from .serializers import AnomalieSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q

class AnomalieViewSet(viewsets.ModelViewSet):
    queryset = Anomalie.objects.all()
    serializer_class = AnomalieSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Anomalie.objects.all()
        search = self.request.query_params.get('search', None)
        criticite = self.request.query_params.get('criticite', None)

        if search:
            queryset = queryset.filter(Q(titre__icontains=search) | Q(description__icontains=search))
        
        if criticite and criticite != 'ALL':
            queryset = queryset.filter(criticite=criticite)
            
        return queryset
    
    # Optionnel : Remplir automatiquement 'cree_par' avec l'utilisateur connecté
    def perform_create(self, serializer):
        instance = serializer.save(cree_par=self.request.user)
        
        # Notification Logic
        test_case = instance.test_case
        if test_case and test_case.campaign:

            recipient = test_case.campaign.imported_by
            recipients = [recipient] if recipient else []
            
            if not recipients:
                from django.contrib.auth import get_user_model
                recipients = list(get_user_model().objects.filter(role='ADMIN'))

            for recipient in recipients:
                if recipient and recipient != self.request.user:
                    from notifications.models import Notification
                    Notification.objects.create(
                        recipient=recipient,
                        title="Nouvelle Anomalie",
                        message=f"{self.request.user.username} a signalé une anomalie sur {test_case.test_case_ref}",
                        type='anomaly_reported',
                        related_campaign=test_case.campaign,
                        related_object_id=instance.id
                    )