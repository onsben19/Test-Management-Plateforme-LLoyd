import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# 1. Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from campaigns.models import Campaign
from testCases.models import TestCase

User = get_user_model()

def create_or_get_tester(username, email, role='TESTER'):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': email, 'role': role}
    )
    if created:
        user.set_password('password123')
        user.save()
        print(f"✅ Créé l'utilisateur {username} avec le rôle {role}")
    else:
        print(f"ℹ️ L'utilisateur {username} existe déjà")
    return user

def seed_custom_testers():
    print("🚀 Démarrage de la configuration pour les testeurs...")

    # 1. Récupérer les testeurs existants
    existing_testers = list(User.objects.filter(role='TESTER'))
    
    if len(existing_testers) >= 2:
        testeur_1 = existing_testers[0]
        testeur_2 = existing_testers[1]
        print(f"✅ Utilisation de deux testeurs existants : '{testeur_1.username}' et '{testeur_2.username}'")
    elif len(existing_testers) == 1:
        testeur_1 = existing_testers[0]
        testeur_2 = create_or_get_tester('testeur_2_fallback', 'testeur2@insuretm.example.com')
        print(f"✅ Utilisation du testeur existant '{testeur_1.username}' et création de '{testeur_2.username}'")
    else:
        testeur_1 = create_or_get_tester('testeur_1_fallback', 'testeur1@insuretm.example.com')
        testeur_2 = create_or_get_tester('testeur_2_fallback', 'testeur2@insuretm.example.com')
        print(f"✅ Aucun testeur existant trouvé. Création de '{testeur_1.username}' et '{testeur_2.username}'")

    # 2. Récupérer une campagne existante pour y attacher les cas de test
    campaign = Campaign.objects.first()
    if not campaign:
        print("⚠️ Aucune campagne trouvée dans la base de données. Veuillez d'abord créer une campagne.")
        return

    print(f"📌 Association des données à la campagne : '{campaign.title}' (ID: {campaign.id})")
    campaign.assigned_testers.add(testeur_1, testeur_2)

    # Nettoyer les anciens tests générés pour ces deux utilisateurs pour éviter la pollution
    TestCase.objects.filter(tester__in=[testeur_1, testeur_2], campaign=campaign).delete()

    # 3. PEUPLEMENT POUR TESTEUR 1 (Profil : Expert - Succès élevé, Charge modérée)
    # 14 tests réussis sur les 7 derniers jours (vélocité = 2 tests/jour, pas surchargé)
    print("📈 Génération de l'historique de performance de Testeur 1 (Expert)...")
    for day in range(7):
        for i in range(2):
            exec_date = timezone.now() - timedelta(days=day)
            tc = TestCase.objects.create(
                campaign=campaign,
                test_case_ref=f"TC1-D{day}-I{i}",
                tester=testeur_1,
                status='PASSED'
            )
            # Mettre à jour manuellement la date d'exécution (auto_now_add override)
            TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)

    # 4. PEUPLEMENT POUR TESTEUR 2 (Profil : Surchargé & Faible performance - Échecs, Charge élevée)
    # 27 tests au total dont beaucoup d'échecs (30% de réussite), charge récente très élevée (9 tests/jour)
    print("📉 Génération de l'historique de performance de Testeur 2 (Surchargé/Faible)...")
    
    # 3 jours glissants de charge très élevée (9 tests par jour)
    for day in range(3):
        for i in range(9):
            exec_date = timezone.now() - timedelta(days=day)
            status = 'PASSED' if random.random() < 0.3 else 'FAILED'
            tc = TestCase.objects.create(
                campaign=campaign,
                test_case_ref=f"TC2-D{day}-I{i}",
                tester=testeur_2,
                status=status
            )
            TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)

    print("🎉 Configuration réussie !")
    print(f"📊 {testeur_1.username} : Performance de 100% de réussite | Charge modérée (éligible aux recommandations)")
    print(f"📊 {testeur_2.username} : Performance de 30% de réussite | Charge très élevée (surchargé/non recommandé)")

if __name__ == "__main__":
    seed_custom_testers()
