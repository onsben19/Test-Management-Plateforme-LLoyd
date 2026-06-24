"""
python manage.py seed_demo
Crée : 10 projets business → 5 releases → 12 campagnes uniques
       + cas de test PENDING + assignation aux testeurs disponibles
"""
import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from business_projects.models import BusinessProject
from Project.models import Project as Release
from campaigns.models import Campaign, CampaignAssignment
from testCases.models import TestCase

User = get_user_model()

BUSINESS_PROJECTS = [
    ("Refonte Portail Sinistres Auto",       "Modernisation du portail de déclaration et suivi des sinistres automobiles."),
    ("Migration SIRH Assurance Vie",         "Migration du système RH vers une plateforme cloud sécurisée."),
    ("Plateforme e-Souscription Santé",      "Portail de souscription en ligne pour les contrats santé."),
    ("Audit Conformité Solvabilité II",      "Mise en conformité réglementaire Solvabilité II."),
    ("Refonte Espace Client Lloyd",          "Refonte UX/UI complète de l'espace client multicanal."),
    ("Intégration API Partenaires Courtage", "Interconnexion des systèmes partenaires via API REST."),
    ("Moteur de Tarification IA",            "Moteur de tarification prédictive basé sur le Machine Learning."),
    ("Plateforme Gestion Contrats MRH",      "Gestion numérique des contrats multirisques habitation."),
    ("Module Fraude & Détection Anomalies",  "Détection automatique de fraudes à la déclaration."),
    ("Tableau de Bord KPI Direction",        "Centralisation des indicateurs métier pour la direction générale."),
]

RELEASE_NAMES = [
    "Socle Technique & Authentification",
    "Module Fonctionnel Core",
    "Intégration & Tests Unitaires",
    "Recette Fonctionnelle",
    "Release Finale & Go-Live",
]

# Chaque titre de campagne est UNIQUE dans toute la base (un seul projet business).
# Format : nom_projet_business → [(titre_campagne, nom_release), ...]
BUSINESS_PROJECT_CAMPAIGNS = {
    "Refonte Portail Sinistres Auto": [
        ("Tests Fonctionnels Authentification", "Module Fonctionnel Core"),
        ("Validation Calculs Tarification",      "Module Fonctionnel Core"),
        ("Validation Export PDF/CSV",             "Recette Fonctionnelle"),
    ],
    "Migration SIRH Assurance Vie": [
        ("Validation Parcours Souscription",     "Module Fonctionnel Core"),
        ("Tests Régression Paiement",             "Recette Fonctionnelle"),
    ],
    "Plateforme e-Souscription Santé": [
        ("Tests Interface Mobile",                  "Recette Fonctionnelle"),
    ],
    "Audit Conformité Solvabilité II": [
        ("Audit Sécurité et Droits d'Accès",        "Recette Fonctionnelle"),
    ],
    "Refonte Espace Client Lloyd": [
        ("Recette Fonctionnelle Utilisateur",      "Recette Fonctionnelle"),
    ],
    "Intégration API Partenaires Courtage": [
        ("Tests API REST Partenaires",             "Module Fonctionnel Core"),
    ],
    "Moteur de Tarification IA": [
        ("Tests Notifications et Alertes",          "Release Finale & Go-Live"),
    ],
    "Plateforme Gestion Contrats MRH": [
        ("Tests Compatibilité Navigateurs",         "Intégration & Tests Unitaires"),
    ],
    "Module Fraude & Détection Anomalies": [
        ("Tests Chiffrement et RGPD",               "Socle Technique & Authentification"),
    ],
    "Tableau de Bord KPI Direction": [],
}

# 2 scénarios réalistes par campagne (PASS + FAIL) — alignés sur scenarios_modal_automation.md
CAMPAIGN_TEST_SCENARIOS = {
    "Tests Fonctionnels Authentification": [
        (
            "TC-AUTH-001 Connexion valide avec OTP",
            "Aller sur http://localhost/login\nSaisir l'email et le mot de passe d'un compte valide\nCliquer sur Se connecter\nVérifier que la page affiche un champ pour saisir un code OTP",
            "L'utilisateur arrive sur l'écran OTP après authentification.",
            "http://localhost/login",
        ),
        (
            "TC-AUTH-002 Connexion avec identifiants incorrects",
            "Aller sur http://localhost/login\nSaisir l'email : faux@inexistant.com\nSaisir le mot de passe : mauvaismdp123\nCliquer sur Se connecter\nVérifier que le texte Bienvenue est visible sur la page",
            "Un message d'erreur s'affiche et l'utilisateur reste sur la page de connexion.",
            "http://localhost/login",
        ),
    ],
    "Validation Parcours Souscription": [
        (
            "TC-SOUSCR-001 Affichage kanban campagnes",
            "Aller sur http://localhost/login\nSe connecter avec un compte manager valide\nSaisir le code OTP\nAller sur http://localhost/manager\nVérifier que la page contient EN RETARD ou EN COURS",
            "Le kanban manager s'affiche avec les colonnes de suivi.",
            "http://localhost/manager",
        ),
        (
            "TC-SOUSCR-002 Accès non autorisé kanban",
            "Aller directement sur http://localhost/manager sans se connecter\nVérifier que la page affiche un tableau kanban avec des campagnes modifiables",
            "L'accès est refusé ou redirige vers la page de connexion.",
            "http://localhost/manager",
        ),
    ],
    "Tests Régression Paiement": [
        (
            "TC-REGR-001 Liste anomalies accessible",
            "Aller sur http://localhost/login\nSe connecter avec un compte valide\nSaisir le code OTP\nAller sur http://localhost/anomalies\nVérifier que la page contient le titre Anomalies ou une liste",
            "La page anomalies charge correctement.",
            "http://localhost/anomalies",
        ),
        (
            "TC-REGR-002 Création anomalie sans titre",
            "Aller sur http://localhost/anomalies\nCliquer sur Nouvelle anomalie\nLaisser le champ titre vide\nCliquer sur Enregistrer\nVérifier que le message Anomalie créée apparaît",
            "La validation bloque l'enregistrement sans titre.",
            "http://localhost/anomalies",
        ),
    ],
    "Audit Sécurité et Droits d'Accès": [
        (
            "TC-SEC-001 Redirection login si non authentifié",
            "Aller directement sur http://localhost/manager sans se connecter\nVérifier que la page redirige vers /login ou affiche Accès non autorisé",
            "L'utilisateur non connecté ne peut pas accéder au manager.",
            "http://localhost/manager",
        ),
        (
            "TC-SEC-002 Testeur accède à la gestion utilisateurs",
            "Se connecter avec un compte testeur\nAller sur http://localhost/users\nVérifier que la liste complète des utilisateurs est modifiable",
            "Un testeur ne doit pas pouvoir gérer les utilisateurs.",
            "http://localhost/users",
        ),
    ],
    "Tests Interface Mobile": [
        (
            "TC-MOB-001 Affichage login sur mobile 375px",
            "Ouvrir http://localhost/login avec une fenêtre de 375 pixels de large\nVérifier que le formulaire est visible sans scroll horizontal\nVérifier que le bouton Se connecter est visible",
            "La page login est utilisable sur mobile.",
            "http://localhost/login",
        ),
        (
            "TC-MOB-002 Débordement formulaire 320px",
            "Ouvrir http://localhost/login avec une fenêtre de 320 pixels de large\nVérifier qu'aucun élément ne dépasse horizontalement",
            "Aucun débordement horizontal sur petit écran.",
            "http://localhost/login",
        ),
    ],
    "Validation Export PDF/CSV": [
        (
            "TC-EXP-001 Chargement page anomalies avec données",
            "Se connecter puis aller sur http://localhost/anomalies\nVérifier que la page affiche une liste ou un tableau",
            "La page anomalies se charge avec des données.",
            "http://localhost/anomalies",
        ),
        (
            "TC-EXP-002 Export CSV déclenche téléchargement immédiat",
            "Aller sur http://localhost/anomalies\nCliquer sur Exporter CSV\nVérifier que le fichier téléchargé contient plus de 100 lignes",
            "L'export CSV ne doit pas inventer des données inexistantes.",
            "http://localhost/anomalies",
        ),
    ],
    "Tests API REST Partenaires": [
        (
            "TC-API-001 Accès page Analytics",
            "Se connecter avec un compte manager\nAller sur http://localhost/analytics\nVérifier que la page s'affiche avec des graphiques ou boutons",
            "La page Analytics est accessible.",
            "http://localhost/analytics",
        ),
        (
            "TC-API-002 Réponse IA sur question invalide",
            "Aller sur http://localhost/analytics\nSaisir dans le chat IA : Quelle est la météo à Paris demain ?\nVérifier que l'IA retourne un graphique météo précis",
            "L'IA doit refuser les questions hors périmètre QA.",
            "http://localhost/analytics",
        ),
    ],
    "Recette Fonctionnelle Utilisateur": [
        (
            "TC-RECT-001 Affichage portefeuille projets",
            "Se connecter avec un compte manager\nAller sur http://localhost/portfolio\nVérifier qu'au moins un projet business est affiché",
            "Le portefeuille liste les projets seedés.",
            "http://localhost/portfolio",
        ),
        (
            "TC-RECT-002 Projet créé sans champ nom",
            "Aller sur http://localhost/portfolio\nCliquer sur Nouveau projet\nLaisser le nom vide\nCliquer sur Enregistrer\nVérifier que le projet apparaît dans la liste",
            "La validation doit empêcher la création sans nom.",
            "http://localhost/portfolio",
        ),
    ],
    "Tests Notifications et Alertes": [
        (
            "TC-NOTIF-001 Ouverture panneau notifications",
            "Se connecter avec un compte valide\nVérifier la présence de l'icône cloche\nCliquer sur l'icône\nVérifier qu'un panneau s'ouvre",
            "Le panneau de notifications s'ouvre au clic.",
            "http://localhost",
        ),
        (
            "TC-NOTIF-002 Clic notification redirige vers page détail",
            "Cliquer sur l'icône cloche\nCliquer sur la première notification\nVérifier un détail complet avec bouton Résoudre fonctionnel",
            "Les notifications sans détail ne doivent pas simuler une page complète.",
            "http://localhost",
        ),
    ],
    "Validation Calculs Tarification": [
        (
            "TC-TARIF-001 Affichage tableau de bord manager",
            "Se connecter avec un compte manager\nAller sur http://localhost/manager/dashboard\nVérifier que des indicateurs ou statistiques sont affichés",
            "Le dashboard manager charge les KPIs.",
            "http://localhost/manager/dashboard",
        ),
        (
            "TC-TARIF-002 Readiness Score cohérent avec données",
            "Aller sur http://localhost/manager/dashboard\nVérifier que le Readiness Score est inférieur à 50% pour les releases en retard",
            "Le score doit refléter l'état réel des campagnes.",
            "http://localhost/manager/dashboard",
        ),
    ],
    "Tests Compatibilité Navigateurs": [
        (
            "TC-COMPAT-001 Rendu formulaire login",
            "Aller sur http://localhost/login\nVérifier que les champs email et mot de passe sont visibles\nVérifier que le bouton Se connecter est visible",
            "Le formulaire de connexion est correctement rendu.",
            "http://localhost/login",
        ),
        (
            "TC-COMPAT-002 Validation format email",
            "Saisir dans le champ email : pasunmail\nSaisir le mot de passe : Test1234!\nCliquer sur Se connecter\nVérifier que la connexion réussit",
            "Un email mal formaté doit être rejeté.",
            "http://localhost/login",
        ),
    ],
    "Tests Chiffrement et RGPD": [
        (
            "TC-RGPD-001 Accès page profil utilisateur",
            "Se connecter avec un compte valide\nAller sur http://localhost/profile\nVérifier que les informations de l'utilisateur connecté sont affichées",
            "La page profil est accessible.",
            "http://localhost/profile",
        ),
        (
            "TC-RGPD-002 Mise à jour prénom persistée",
            "Aller sur http://localhost/profile\nModifier le prénom avec TestRGPD\nCliquer sur Enregistrer\nRecharger la page\nVérifier que le prénom affiché est TestRGPD",
            "Les modifications profil doivent être persistées.",
            "http://localhost/profile",
        ),
    ],
}


def _build_data_json(steps: str, expected: str, url: str) -> dict:
    return {
        "manualData": steps,
        "action": steps.replace("\n", " "),
        "expected": expected,
        "url": url,
    }


def _assign_testers(campaign, testers, nb_tc, campaign_index):
    """Répartit 1 ou 2 testeurs par campagne avec quotas cohérents."""
    if not testers:
        return []

    if len(testers) == 1:
        CampaignAssignment.objects.create(
            campaign=campaign,
            tester=testers[0],
            test_quota=nb_tc,
        )
        return [(testers[0], nb_tc)]

    primary = testers[campaign_index % len(testers)]
    secondary = testers[(campaign_index + 1) % len(testers)]
    if primary.id == secondary.id:
        secondary = testers[(campaign_index + 2) % len(testers)]

    q1 = (nb_tc + 1) // 2
    q2 = nb_tc - q1
    CampaignAssignment.objects.create(campaign=campaign, tester=primary, test_quota=q1)
    if q2 > 0 and secondary.id != primary.id:
        CampaignAssignment.objects.create(campaign=campaign, tester=secondary, test_quota=q2)
        return [(primary, q1), (secondary, q2)]
    return [(primary, q1)]


def _create_pending_tests(campaign, scenarios, assigned_pairs):
    """Crée les cas de test PENDING, répartis entre testeurs assignés."""
    if not assigned_pairs:
        return 0

    created = 0
    for idx, (ref, steps, expected, url) in enumerate(scenarios):
        tester = assigned_pairs[idx % len(assigned_pairs)][0]
        _, was_created = TestCase.objects.get_or_create(
            campaign=campaign,
            test_case_ref=ref,
            defaults={
                "data_json": _build_data_json(steps, expected, url),
                "status": "PENDING",
                "tester": tester,
            },
        )
        if was_created:
            created += 1
    return created


class Command(BaseCommand):
    help = "Nettoie la base (hors users) et injecte des données de démo avec assignations testeurs"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("🗑  Nettoyage..."))
        from anomalies.models import Anomalie

        Anomalie.objects.all().delete()
        TestCase.objects.all().delete()
        CampaignAssignment.objects.all().delete()
        Campaign.objects.all().delete()
        Release.objects.all().delete()
        BusinessProject.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("   Base nettoyée.\n"))

        managers = list(User.objects.filter(role='MANAGER'))
        if not managers:
            managers = list(User.objects.filter(is_superuser=True))
        if not managers:
            self.stdout.write(self.style.ERROR("Aucun MANAGER trouvé."))
            return

        testers = list(User.objects.filter(role='TESTER').order_by('id'))
        if not testers:
            self.stdout.write(self.style.WARNING(
                "⚠  Aucun testeur (role=TESTER) trouvé — campagnes créées sans assignation."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"👥 {len(testers)} testeur(s) : {', '.join(t.username for t in testers)}"
            ))

        today = date.today()
        campaign_index = 0
        total_tests = 0
        total_assignments = 0

        for bp_name, bp_desc in BUSINESS_PROJECTS:
            manager = random.choice(managers)
            bp = BusinessProject.objects.create(
                name=bp_name,
                description=bp_desc,
                status='ACTIF',
                created_by=manager,
            )
            self.stdout.write(f"📁 {bp_name}")

            releases_by_name = {}
            for j, rel_name in enumerate(RELEASE_NAMES):
                rel_status = 'ACTIVE' if j < 3 else random.choice(['ACTIVE', 'PLANNING'])
                rel_type = 'PREPROD' if j % 2 == 0 else 'RECETTE'
                release = Release.objects.create(
                    name=rel_name,
                    description=f"Release '{rel_name}' — {bp_name}",
                    status=rel_status,
                    release_type=rel_type,
                    business_project=bp,
                    created_by=manager,
                )
                releases_by_name[rel_name] = release

            for camp_title, target_release in BUSINESS_PROJECT_CAMPAIGNS.get(bp_name, []):
                release = releases_by_name.get(target_release)
                if not release:
                    self.stdout.write(self.style.WARNING(
                        f"   ⚠ Release '{target_release}' introuvable pour {camp_title}"
                    ))
                    continue

                scenarios = CAMPAIGN_TEST_SCENARIOS.get(camp_title, [])
                nb_tc = len(scenarios) or 2
                start = today - timedelta(days=random.randint(5, 25))
                end = today + timedelta(days=random.randint(10, 30))

                campaign = Campaign.objects.create(
                    title=camp_title,
                    description=(
                        f"Campagne de recette « {camp_title} » pour {bp_name}. "
                        f"Release cible : {target_release}. "
                        f"{nb_tc} cas de test à exécuter manuellement ou via Playwright IA."
                    ),
                    project=release,
                    start_date=start,
                    estimated_end_date=end,
                    nb_test_cases=nb_tc,
                    imported_by=manager,
                    scheduled_at=None,
                )
                self.stdout.write(f"   └ {camp_title} → {target_release} ({nb_tc} TC)")

                if testers and scenarios:
                    assigned = _assign_testers(campaign, testers, nb_tc, campaign_index)
                    total_assignments += len(assigned)
                    created = _create_pending_tests(campaign, scenarios, assigned)
                    total_tests += created
                    assign_info = ", ".join(f"{t.username} (quota {q})" for t, q in assigned)
                    self.stdout.write(f"      → {assign_info}")

                campaign_index += 1

        self.stdout.write(self.style.SUCCESS(f"\n✅ Seed terminé !"))
        self.stdout.write(f"   {BusinessProject.objects.count()} projets business")
        self.stdout.write(f"   {Release.objects.count()} releases")
        self.stdout.write(f"   {Campaign.objects.count()} campagnes")
        self.stdout.write(f"   {CampaignAssignment.objects.count()} assignations testeurs")
        self.stdout.write(f"   {TestCase.objects.count()} cas de test PENDING ({total_tests} créés)")

        from django.core.cache import cache
        cache.clear()
        self.stdout.write(self.style.SUCCESS("   Cache invalidé."))

        if testers:
            self.stdout.write(
                "\n📋 Prochaine étape : connectez-vous en testeur sur http://localhost/tester-dashboard"
                "\n   → Ouvrez une campagne assignée → exécutez les cas TC-* manuellement ou via IA."
            )
