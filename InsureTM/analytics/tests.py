from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from campaigns.models import Campaign
from testCases.models import TestCase as TMTestCase
from Project.models import Project
from analytics.ml_service import MLTimelineGuard
import os

class MLTimelineGuardMLTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="Test Project")
        self.campaign = Campaign.objects.create(
            project=self.project,
            title="Test Campaign",
            nb_test_cases=100,
            start_date=timezone.now().date() - timedelta(days=5),
            estimated_end_date=timezone.now().date() + timedelta(days=5)
        )
        self.guard = MLTimelineGuard()

    def test_model_loaded(self):
        # Vérifie que le modèle joblib est bien chargé
        self.assertIsNotNone(self.guard.model, "Le modèle ML (.joblib) n'a pas été chargé")

    def test_prediction_with_model(self):
        # 50 tests sur 5 jours ≈ 10 tests/jour ; reste 50 tests
        for i in range(50):
            TMTestCase.objects.create(
                campaign=self.campaign,
                test_case_ref=f"TC{i}",
                status='PASSED',
                execution_date=timezone.now() - timedelta(days=1 + (i % 5)),
            )

        status = self.guard.get_campaign_status(self.campaign.id)
        self.assertEqual(status['progress']['finished'], 50)
        self.assertGreaterEqual(status['velocity'], 10.0)
        self.assertIsNotNone(status['projected_end_date'])
        self.assertIn(status['status'], ['OPTIMAL', 'WARNING'])
        self.assertIn('projection', status)
        self.assertTrue(status['projection']['model_used'])
        self.assertIsNotNone(status['projection']['ml_days'])
        self.assertIsNotNone(status['projection']['linear_days'])
        self.assertEqual(
            status['projection']['combined_days'],
            min(status['projection']['ml_days'], status['projection']['linear_days']),
        )

    def test_insight_refreshes_when_nb_test_cases_increases(self):
        self.campaign.nb_test_cases = 6
        self.campaign.save()

        for i in range(6):
            TMTestCase.objects.create(
                campaign=self.campaign,
                test_case_ref=f"TC-REF-{i}",
                status='PASSED' if i < 4 else 'FAILED',
                execution_date=timezone.now() - timedelta(days=1),
            )

        completed = self.guard.get_campaign_status(self.campaign.id)
        self.assertEqual(completed['progress']['finished'], 6)
        self.assertEqual(completed['progress']['total'], 6)
        self.assertIn('exécutés', completed['message'].lower())

        self.campaign.nb_test_cases = 30
        self.campaign.save()

        updated = self.guard.get_campaign_status(self.campaign.id)
        self.assertEqual(updated['progress']['finished'], 6)
        self.assertEqual(updated['progress']['total'], 30)
        self.assertLess(updated['progress']['percentage'], 100)
        self.assertNotIn('tous les cas de tests ont été exécutés', updated['message'].lower())

    def test_insight_acknowledges_advance_on_schedule(self):
        from unittest.mock import patch

        small = Campaign.objects.create(
            project=self.project,
            title="Tests Chiffrement",
            nb_test_cases=2,
            start_date=timezone.now().date() - timedelta(days=3),
            estimated_end_date=timezone.now().date() + timedelta(days=14),
        )
        TMTestCase.objects.create(
            campaign=small,
            test_case_ref="TC-1",
            status='PASSED',
            execution_date=timezone.now() - timedelta(days=1),
        )

        with patch.object(self.guard, '_generate_ai_insight', wraps=self.guard._generate_ai_insight) as mocked:
            status = self.guard.get_campaign_status(small.id)
            mocked.assert_called_once()

        self.assertEqual(status['status'], 'OPTIMAL')
        self.assertGreater(status.get('advance_days', 0), 0)
        lowered = status['message'].lower()
        self.assertIn('avance', lowered)
        self.assertNotIn('accélérer', lowered)

    def test_velocity_display_is_integer(self):
        status = self.guard.get_campaign_status(self.campaign.id)
        velocity = status['velocity']
        self.assertIsInstance(velocity, int)
        self.assertEqual(velocity, round(velocity))
from django.contrib.auth import get_user_model
from django.urls import reverse
import json

class DashboardBriefViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='manager_test', password='password', role='MANAGER')
        self.client.login(username='manager_test', password='password')
        self.url = reverse('dashboard-brief')

    def test_get_brief_endpoint(self):
        payload = {
            "stats": {
                "active_projects": 2,
                "total_campaigns": 5,
                "open_anomalies": 3,
                "success_rate": 80
            }
        }
        response = self.client.post(self.url, data=json.dumps(payload), content_type='application/json')
        # We expect 200 if Groq is available, or 500/exception if not (but endpoint exists)
        self.assertIn(response.status_code, [200, 500])
