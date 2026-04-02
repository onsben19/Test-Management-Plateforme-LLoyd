import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from django.contrib.auth import get_user_model
from .models import Campaign, TaskAssignment
from .serializers import CampaignSerializer, TaskAssignmentSerializer
from notifications.models import Notification
from utils.email_service import send_campaign_created_email

logger = logging.getLogger(__name__)


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = Campaign.objects.all()
        user = self.request.user

        if hasattr(user, 'role') and user.role == 'TESTER':
            queryset = queryset.filter(
                Q(assigned_testers=user) &
                (Q(scheduled_at__lte=timezone.now()) | Q(scheduled_at__isnull=True))
            )

        project_id = self.request.query_params.get('project')
        search = self.request.query_params.get('search')

        if project_id:
            queryset = queryset.filter(project_id=project_id)

        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(imported_by=self.request.user)
        
        # Notify ADMINs and MANAGERs when a campaign is created
        User = get_user_model()
        recipients = User.objects.filter(role__in=['ADMIN', 'MANAGER']).exclude(id=self.request.user.id)
        
        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title="Nouvelle Campagne",
                message=f"{self.request.user.username} a créé la campagne : {instance.title}",
                type='info',
                related_campaign=instance
            )
            if recipient.email:
                send_campaign_created_email(recipient, self.request.user, instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Notify all assigned testers of the update
        testers = instance.assigned_testers.all()
        for tester in testers:
            if tester != self.request.user:
                Notification.objects.create(
                    recipient=tester,
                    title="Mise à jour Campagne",
                    message=f"La campagne '{instance.title}' a été mise à jour.",
                    type='info',
                    related_campaign=instance
                )

    def perform_destroy(self, instance):
        # Notify assigned testers before deletion
        testers = instance.assigned_testers.all()
        for tester in testers:
            if tester != self.request.user:
                Notification.objects.create(
                    recipient=tester,
                    title="Campagne Supprimée",
                    message=f"La campagne '{instance.title}' a été supprimée.",
                    type='info'
                )
        instance.delete()


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]