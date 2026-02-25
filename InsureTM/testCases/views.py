import logging

from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from notifications.models import Notification
from .models import TestCase
from .serializers import TestCaseSerializer

logger = logging.getLogger(__name__)


class IsTesterOrAdmin(permissions.BasePermission):
    """Allow read access to all authenticated users; write access only to Testers and Admins."""

    def has_permission(self, request, view):
        if view.action in ['list', 'retrieve']:
            return True
        return request.user.is_authenticated and request.user.role in ['TESTER', 'ADMIN']


class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsTesterOrAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = TestCase.objects.all()
        search = self.request.query_params.get('search')
        status = self.request.query_params.get('status')

        if search:
            queryset = queryset.filter(
                Q(test_case_ref__icontains=search) |
                Q(campaign__title__icontains=search)
            )

        if status and status != 'ALL':
            queryset = queryset.filter(status=status)

        return queryset

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance

        if user.role == 'ADMIN' and instance.tester:
            serializer.save()
        else:
            serializer.save(tester=user)

        # Send notification when a test is completed
        updated = serializer.instance
        if updated.status in ['PASSED', 'FAILED']:
            campaign = updated.campaign
            recipient = campaign.imported_by
            recipients = [recipient] if recipient else list(
                get_user_model().objects.filter(role='ADMIN')
            )

            for r in recipients:
                if r and r != user:
                    Notification.objects.create(
                        recipient=r,
                        title=f"Test {updated.status}",
                        message=f"{user.username} a exécuté le test {updated.test_case_ref} : {updated.status}",
                        type='execution_validated',
                        related_campaign=campaign,
                        related_object_id=updated.id,
                    )