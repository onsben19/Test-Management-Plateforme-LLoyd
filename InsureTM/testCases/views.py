import logging

from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from notifications.models import Notification
from utils.email_service import send_execution_validated_email
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
        instance = self.get_object()
        old_status = instance.status
        old_tester = instance.tester

        # If Admin is editing, keep original tester unless deliberately changed?
        # Current logic: Admins keep tester, Testers take ownership.
        if user.role == 'ADMIN' and instance.tester:
            serializer.save()
        else:
            serializer.save(tester=user)

        updated = serializer.instance
        campaign = updated.campaign

        # 1. Notify Manager of Execution Results (PASSED/FAILED)
        if updated.status in ['PASSED', 'FAILED'] and old_status != updated.status:
            recipients = set()
            if campaign and campaign.imported_by:
                recipients.add(campaign.imported_by)
            # Add all Admins if no specific manager
            if not recipients:
                recipients.update(get_user_model().objects.filter(role='ADMIN'))
            
            recipients.discard(user)
            for r in recipients:
                Notification.objects.create(
                    recipient=r,
                    title=f"Test {updated.status}",
                    message=f"{user.username} a exécuté le test {updated.test_case_ref} : {updated.status}",
                    type='execution_validated',
                    related_campaign=campaign,
                    related_object_id=updated.id,
                )
                if r.email:
                    send_execution_validated_email(r, user, updated)

        # 2. Notify Tester if Admin changed status or re-assigned
        if user.role == 'ADMIN' and updated.tester and user != updated.tester:
            if old_status != updated.status or old_tester != updated.tester:
                Notification.objects.create(
                    recipient=updated.tester,
                    title="Mise à jour de Test",
                    message=f"L'administrateur a mis à jour votre test {updated.test_case_ref} : {updated.status}",
                    type='info',
                    related_campaign=campaign,
                    related_object_id=updated.id
                )

    def perform_destroy(self, instance):
        campaign = instance.campaign
        tester = instance.tester
        manager = campaign.imported_by if campaign else None
        
        recipients = set()
        if tester: recipients.add(tester)
        if manager: recipients.add(manager)
        recipients.discard(self.request.user)
        
        for r in recipients:
            Notification.objects.create(
                recipient=r,
                title="Cas de test Supprimé",
                message=f"Le cas de test {instance.test_case_ref} a été supprimé.",
                type='info'
            )
        instance.delete()