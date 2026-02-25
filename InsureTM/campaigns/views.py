import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Campaign, TaskAssignment
from .serializers import CampaignSerializer, TaskAssignmentSerializer

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
                Q(scheduled_at__lte=timezone.now()) | Q(scheduled_at__isnull=True)
            )

        project_id = self.request.query_params.get('project')
        search = self.request.query_params.get('search')

        if project_id:
            queryset = queryset.filter(project_id=project_id)

        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return queryset

    def perform_create(self, serializer):
        serializer.save(imported_by=self.request.user)


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]