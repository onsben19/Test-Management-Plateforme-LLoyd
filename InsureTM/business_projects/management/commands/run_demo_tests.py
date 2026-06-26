"""
python manage.py run_demo_tests
- Crée 1 cas de test par campagne (12 scénarios)
- Génère le script Playwright via Groq
- Lance l'exécution Playwright en arrière-plan
"""
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from campaigns.models import Campaign, CampaignAssignment
from testCases.models import TestCase
from analytics.groq_service import GroqService

User = get_user_model()


def _display_url(path: str) -> str:
    base = getattr(settings, 'APP_URL', '').rstrip('/')
    if not base:
        return path
    return f'{base}{path}' if path.startswith('/') else f'{base}/{path}'

# Scénarios : (titre partiel campagne, ref, description du test)
SCENARIOS = [
    (
        "Authentification",
        "TC-AUTH-001",
        {
            "action": "Aller sur /login. Saisir l'email tester@lloyd.com et le mot de passe Test1234!. Cliquer sur Se connecter. Vérifier que la page demande un code OTP. Saisir le code 000000. Vérifier que le tableau de bord s'affiche.",
            "expected": "L'utilisateur arrive sur son espace après validation OTP.",
            "url": "/login"
        }
    ),
    (
        "Souscription",
        "TC-SOUSCR-001",
        {
            "action": "Se connecter sur /login avec manager@lloyd.com / Test1234!. Aller sur /manager. Vérifier que le kanban des campagnes s'affiche avec au moins une colonne.",
            "expected": "Le kanban affiche les colonnes EN RETARD, EN COURS, TERMINÉ.",
            "url": "/manager"
        }
    ),
    (
        "Régression",
        "TC-REGR-001",
        {
            "action": "Se connecter sur /login. Aller sur /anomalies. Vérifier que la liste des anomalies s'affiche. Vérifier que le bouton Nouvelle anomalie est visible.",
            "expected": "La page anomalies charge correctement avec la liste et le bouton de création.",
            "url": "/anomalies"
        }
    ),
    (
        "Sécurité",
        "TC-SEC-001",
        {
            "action": "Ouvrir /login. Saisir des identifiants incorrects (email: faux@test.com, mot de passe: mauvais). Cliquer sur Se connecter. Vérifier qu'un message d'erreur apparaît et que l'utilisateur reste sur la page de connexion.",
            "expected": "Un message d'erreur s'affiche et la redirection ne se produit pas.",
            "url": "/login"
        }
    ),
    (
        "Interface Mobile",
        "TC-MOB-001",
        {
            "action": "Aller sur / avec un viewport de 375x812. Vérifier que la page s'affiche sans débordement horizontal. Vérifier que le logo InsureTM est visible.",
            "expected": "La page s'adapte correctement au format mobile sans scrollbar horizontal.",
            "url": "/"
        }
    ),
    (
        "Export",
        "TC-EXP-001",
        {
            "action": "Se connecter sur /login. Aller sur /anomalies. Vérifier que la page des anomalies se charge. Vérifier qu'il y a au moins un élément dans la liste.",
            "expected": "La liste des anomalies est chargée et accessible.",
            "url": "/anomalies"
        }
    ),
    (
        "API REST",
        "TC-API-001",
        {
            "action": "Se connecter sur /login. Aller sur /analytics. Vérifier que la page Analytics se charge. Vérifier que le widget de chat IA est visible ou qu'un bouton pour l'ouvrir est présent.",
            "expected": "La page Analytics charge avec le module Text-to-SQL visible.",
            "url": "/analytics"
        }
    ),
    (
        "Recette Fonctionnelle",
        "TC-RECT-001",
        {
            "action": "Se connecter sur /login. Aller sur /portfolio. Vérifier que la liste des projets business s'affiche. Vérifier qu'au moins un projet est visible.",
            "expected": "Le portefeuille affiche les projets créés par le seed.",
            "url": "/portfolio"
        }
    ),
    (
        "Notifications",
        "TC-NOTIF-001",
        {
            "action": "Se connecter sur /login. Vérifier que l'en-tête contient une icône de notification (cloche). Cliquer sur l'icône. Vérifier que le panneau de notifications s'ouvre.",
            "expected": "Le panneau de notifications s'ouvre au clic sur l'icône.",
            "url": "/"
        }
    ),
    (
        "Tarification",
        "TC-TARIF-001",
        {
            "action": "Se connecter sur /login. Aller sur /manager/dashboard. Vérifier que le tableau de bord manager se charge. Vérifier qu'au moins un indicateur KPI est affiché.",
            "expected": "Le tableau de bord manager affiche les KPIs et le Readiness Score.",
            "url": "/manager/dashboard"
        }
    ),
    (
        "Compatibilité",
        "TC-COMPAT-001",
        {
            "action": "Ouvrir /login. Vérifier que le formulaire de connexion est affiché avec les champs email et mot de passe. Vérifier que le titre InsureTM est visible sur la page.",
            "expected": "Le formulaire de connexion s'affiche correctement avec tous les éléments.",
            "url": "/login"
        }
    ),
    (
        "RGPD",
        "TC-RGPD-001",
        {
            "action": "Se connecter sur /login. Aller sur /profile. Vérifier que la page de profil se charge. Vérifier que les champs nom, prénom et email sont visibles.",
            "expected": "La page profil affiche les informations de l'utilisateur connecté.",
            "url": "/profile"
        }
    ),
]


class Command(BaseCommand):
    help = "Crée les cas de test, génère les scripts IA et lance les exécutions Playwright"

    def handle(self, *args, **kwargs):
        groq = GroqService()
        tester = User.objects.filter(role='TESTER').first()
        if not tester:
            tester = User.objects.filter(is_superuser=True).first()
        if not tester:
            self.stdout.write(self.style.ERROR("Aucun testeur trouvé."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(f"🤖 Testeur : {tester.username}"))
        app_url = getattr(settings, 'APP_URL', '').rstrip('/')
        if app_url:
            self.stdout.write(self.style.SUCCESS(f"🌐 APP_URL : {app_url}\n"))
        campaigns = list(Campaign.objects.all())

        for ref, scenario_title, data in SCENARIOS:
            # Trouver la campagne correspondante
            camp = next(
                (c for c in campaigns if any(kw.lower() in c.title.lower() for kw in ref.split())),
                None
            )
            if not camp:
                self.stdout.write(self.style.WARNING(f"   ⚠ Campagne introuvable pour : {ref}"))
                continue

            # Assigner le testeur si pas déjà fait
            CampaignAssignment.objects.get_or_create(
                campaign=camp, tester=tester,
                defaults={'test_quota': 5}
            )

            # Créer le cas de test
            tc, created = TestCase.objects.get_or_create(
                test_case_ref=scenario_title,
                campaign=camp,
                defaults={
                    'data_json': data,
                    'status': 'PENDING',
                    'tester': tester,
                }
            )

            if not created:
                self.stdout.write(f"   ↩ {scenario_title} déjà existant, ignoré.")
                continue

            # Générer le script via Groq
            self.stdout.write(f"\n🔧 [{camp.title}] Génération script : {scenario_title}")
            try:
                script = groq.generate_playwright_test(
                    test_title=scenario_title,
                    test_data_json=str(data)
                )
                if script:
                    tc.automation_code = script
                    tc.is_automated = True
                    tc.save(update_fields=['automation_code', 'is_automated'])
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Script généré ({len(script)} chars)"))
                else:
                    self.stdout.write(self.style.WARNING("   ⚠ Script vide retourné par Groq"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ Erreur Groq : {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ {TestCase.objects.count()} cas de test créés avec scripts."
        ))
        dashboard_url = _display_url('/tester-dashboard')
        self.stdout.write(
            f"\n📋 Lance maintenant les exécutions depuis l'interface :\n"
            f"   {dashboard_url}\n"
            "   → Ouvre chaque cas de test → 'Lancer l'exécution'"
        )
