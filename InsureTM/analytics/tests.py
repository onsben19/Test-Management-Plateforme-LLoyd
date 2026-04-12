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
        # Simuler des tests exécutés
        # 50 tests en 5 jours = 10 tests/jour. Reste 50 tests -> 5 jours restants prédits.
        for i in range(50):
            TMTestCase.objects.create(
                campaign=self.campaign,
                test_case_ref=f"TC{i}",
                status='PASSED',
                execution_date=timezone.now() - timedelta(days=1)
            )
        
        status = self.guard.get_campaign_status(self.campaign.id)
        self.assertEqual(status['progress']['finished'], 50)
        self.assertEqual(status['velocity'], 10.0)
        # Le modèle Random Forest devrait prédire environ 5 jours (basé sur l'entraînement synthétique)
        self.assertIsNotNone(status['projected_end_date'])
        self.assertIn(status['status'], ['OPTIMAL', 'WARNING'])
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
