import logging

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from notifications.models import Notification
from .models import Anomalie
from .serializers import AnomalieSerializer

logger = logging.getLogger(__name__)


class AnomalieViewSet(viewsets.ModelViewSet):
    queryset = Anomalie.objects.all()
    serializer_class = AnomalieSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = Anomalie.objects.all()
        search = self.request.query_params.get('search')
        criticite = self.request.query_params.get('criticite')

        if search:
            queryset = queryset.filter(Q(titre__icontains=search) | Q(description__icontains=search))

        if criticite and criticite != 'ALL':
            queryset = queryset.filter(criticite=criticite)

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(cree_par=self.request.user)

        test_case = instance.test_case
        if not (test_case and test_case.campaign):
            return

        campaign = test_case.campaign
        recipient = campaign.imported_by
        recipients = [recipient] if recipient else list(
            get_user_model().objects.filter(role='ADMIN')
        )

        for r in recipients:
            if r and r != self.request.user:
                Notification.objects.create(
                    recipient=r,
                    title="Nouvelle Anomalie",
                    message=f"{self.request.user.username} a signalé une anomalie sur {test_case.test_case_ref}",
                    type='anomaly_reported',
                    related_campaign=campaign,
                    related_object_id=instance.id,
                )