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
from rest_framework.decorators import action
from rest_framework.response import Response

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

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        campaign = self.get_object()
        from testCases.models import TestCase
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()
        yesterday = now - timedelta(days=1)
        two_hours_ago = now - timedelta(hours=2)

        # KPIs
        testers = campaign.assigned_testers.all()
        active_testers_count = testers.count() # Simplified
        
        # Velocity last 2h (tests per hour)
        tests_2h = TestCase.objects.filter(campaign=campaign, execution_date__gte=two_hours_ago).count()
        v_2h = tests_2h / 2.0

        # Velocity yesterday
        tests_yesterday = TestCase.objects.filter(
            campaign=campaign, 
            execution_date__gte=yesterday,
            execution_date__lt=now
        ).count()
        v_yesterday = tests_yesterday / 24.0

        # Blocked testers (no activity in 1h)
        blocked_testers = 0
        for tester in testers:
            last_test = TestCase.objects.filter(campaign=campaign, tester=tester).order_by('-execution_date').first()
            if last_test and last_test.execution_date < (now - timedelta(hours=1)):
                blocked_testers += 1

        # Testers list
        tester_list = []
        for tester in testers:
            last_test = TestCase.objects.filter(campaign=campaign, tester=tester).order_by('-execution_date').first()
            status = 'offline'
            action_str = 'Inactif'
            
            if last_test:
                if last_test.execution_date >= (now - timedelta(hours=1)):
                    status = 'active'
                    action_str = f"A validé TC{last_test.test_case_ref}" if last_test.status == 'PASSED' else f"Échec sur TC{last_test.test_case_ref}"
                else:
                    status = 'idle'
                    action_str = "Inactif"
            
            # Daily progress (mocked: 10 tests/day goal)
            daily_count = TestCase.objects.filter(campaign=campaign, tester=tester, execution_date__date=now.date()).count()
            daily_progress = min(100, int((daily_count / 10.0) * 100))
            
            tester_list.append({
                "id": tester.id,
                "name": tester.username,
                "status": status,
                "action": action_str,
                "velocity": daily_count,
                "dailyProgress": daily_progress,
                "idleSince": last_test.execution_date.isoformat() if last_test else None
            })

        # Recent activities
        recent_tests = TestCase.objects.filter(campaign=campaign).order_by('-execution_date')[:20]
        recent_activity = []
        for t in recent_tests:
            recent_activity.append({
                "id": f"snapshot-{t.id}",
                "type": "success" if t.status == 'PASSED' else "failure",
                "message": f"Testeur {t.tester.username} a {'validé' if t.status == 'PASSED' else 'échoué sur'} TC{t.test_case_ref}",
                "timestamp": t.execution_date.isoformat()
            })

        return Response({
            "kpis": {
                "activeTesters": active_testers_count,
                "velocity2h": v_2h,
                "velocityYesterday": v_yesterday,
                "blockedTesters": blocked_testers
            },
            "testers": tester_list,
            "recent_activity": recent_activity
        })


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]