
import os
import django
import sys
from datetime import date

# Setup Django environment
sys.path.append('/Users/user/Desktop/projet fe/InsureTM')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from Project.models import Project
from campaigns.models import Campaign
from testCases.models import TestCase
from anomalies.models import Anomalie

User = get_user_model()

# Get or Create User
try:
    user = User.objects.first()
    if not user:
        user = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        print("Created superuser 'admin'")
    else:
        print(f"Using existing user: {user.username}")

    # Create Project
    project, created = Project.objects.get_or_create(
        name="Projet Alpha",
        defaults={
            'description': "Projet de test pour analytics",
            'created_by': user
        }
    )
    print(f"Project: {project.name}")

    # Create Campaign
    campaign, created = Campaign.objects.get_or_create(
        title="Campagne Q1",
        project=project,
        defaults={
            'description': "Campagne de test trimestrielle",
            'start_date': date.today(),
            'imported_by': user
        }
    )
    print(f"Campaign: {campaign.title}")

    # Create TestCase
    test_case, created = TestCase.objects.get_or_create(
        test_case_ref="TC-001",
        campaign=campaign,
        defaults={
            'data_json': {"step": "Login"},
            'status': 'FAILED',
            'tester': user
        }
    )
    print(f"TestCase: {test_case.test_case_ref}")

    # Create Anomalies
    anomalies_data = [
        {"titre": "Crash au login", "criticite": "CRITIQUE", "desc": "L'app plante quand on clique sur Login"},
        {"titre": "Faute de frappe", "criticite": "FAIBLE", "desc": "Texte 'Aceui' au lieu de 'Accueil'"},
        {"titre": "Lenteur chargement", "criticite": "MOYENNE", "desc": "La page met 5s à charger"},
        {"titre": "Données manquantes", "criticite": "CRITIQUE", "desc": "Tableau vide après filtre"}
    ]

    for data in anomalies_data:
        anom, created = Anomalie.objects.get_or_create(
            titre=data["titre"],
            test_case=test_case,
            defaults={
                'description': data["desc"],
                'criticite': data["criticite"],
                'cree_par': user
            }
        )
        if created:
            print(f"Created Anomaly: {anom.titre} ({anom.criticite})")
        else:
            print(f"Anomaly already exists: {anom.titre}")

    print(f"Total Anomalies Now: {Anomalie.objects.count()}")

except Exception as e:
    print(f"Error seeding data: {e}")
