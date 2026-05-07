# TABLE DES MATIÈRES

**DÉDICACES**
**REMERCIEMENTS**
**LISTE DES FIGURES**
**LISTE DES TABLEAUX**
**LISTE DES ABRÉVIATIONS**

**INTRODUCTION GÉNÉRALE ............................................................................................ 1**

### CHAPITRE 1 : CONTEXTE GÉNÉRAL DU PROJET ....................................................... 3
1.1 INTRODUCTION ...................................................................................................... 4
1.2 PRÉSENTATION DE L'ORGANISME D'ACCUEIL (LLOYD ASSURANCES) ...................... 4
1.3 PRÉSENTATION DU PROJET (INSURETM) .................................................................. 5
1.4 PROBLÉMATIQUE ................................................................................................... 6
1.5 ÉTUDE DE L’EXISTANT ET SOLUTIONS PROPOSÉES ................................................. 7
    1.5.1 ANALYSE DE L’EXISTANT (Processus QA Manuel) ........................................ 7
    1.5.2 CRITIQUE DE L’EXISTANT ................................................................................ 8
    1.5.3 DESCRIPTION DE LA SOLUTION (Plateforme AI-Driven QA) .......................... 9
1.6 MÉTHODOLOGIE DE TRAVAIL : APPROCHE HYBRIDE ............................................. 10
    1.6.1 JUSTIFICATION DE L'APPROCHE HYBRIDE (UP + SCRUM) ........................... 11
    1.6.2 CADRAGE ET CONCEPTION (Phase Cascade / Waterfall) ............................ 12
    1.6.3 EXÉCUTION ET RÉALISATION (Phase Agile / Scrum) .................................. 13
1.7 CONCLUSION ....................................................................................................... 14

### CHAPITRE 2 : ÉTUDE PRÉLIMINAIRE ET ARCHITECTURE ...................................... 15
2.1 INTRODUCTION .................................................................................................... 16
2.2 ANALYSE DES EXIGENCES .................................................................................... 16
    2.2.1 IDENTIFICATION DES ACTEURS (Admin, Manager, Testeur) ....................... 17
    2.2.2 EXIGENCES FONCTIONNELLES (Reporting AI, Tracking, Scoring) ................. 18
    2.2.3 EXIGENCES NON FONCTIONNELLES (Sécurité, UX Premium) ...................... 20
2.3 DIAGRAMME DE CAS D’UTILISATION GLOBAL ....................................................... 22
2.4 CONCEPTION DE L'ARCHITECTURE TECHNIQUE ..................................................... 24
    2.4.1 ARCHITECTURE PHYSIQUE (Docker Compose, Nginx, PostgreSQL) ............. 24
    2.4.2 ARCHITECTURE LOGIQUE (Architecture MVC Découplée) .......................... 26
2.5 ENVIRONNEMENT DE TRAVAIL ET CHOIX TECHNOLOGIQUES ............................... 28
    2.5.1 FRONTEND : REACT 19, TAILWIND CSS & VITE ............................................ 29
    2.5.2 BACKEND : DJANGO 5, DRF & SERVICES IA (Groq/Llama) .......................... 31
2.6 CONCLUSION ....................................................................................................... 33

### CHAPITRE 3 : RELEASE 1 : IDENTITÉ, ACCÈS ET SÉCURITÉ ................................... 34
3.1 INTRODUCTION .................................................................................................... 35
3.2 SPRINT 1 : AUTHENTIFICATION AVANCÉE ET SÉCURITÉ (JWT, 2FA) ........................ 35
    3.2.1 CONCEPTION (Description Textuelle et Séquence) .................................... 36
    3.2.2 MISE EN ŒUVRE (Interfaces Premium & Double Authentification) ............. 38
3.3 SPRINT 2 : GESTION DES UTILISATEURS ET DES PROFILS ....................................... 40
    3.3.1 MISE EN ŒUVRE (Espace Administration et Gestion des Rôles) .................. 41
3.4 CONCLUSION ....................................................................................................... 43

### CHAPITRE 4 : RELEASE 2 : CŒUR QA ET GESTION DES TESTS ............................... 44
4.1 INTRODUCTION .................................................................................................... 45
4.2 SPRINT 3 : GESTION DES PROJETS ET DES CAMPAGNES ........................................ 45
    4.2.1 CONCEPTION (Diagramme de Classes et Objets) ........................................ 46
    4.2.2 MISE EN ŒUVRE (Portfolio de Projets et Gestion des Versions) ................. 48
4.3 SPRINT 4 : PROCESSUS D'EXÉCUTION ET WORKFLOW D'ANOMALIE ..................... 51
    4.3.1 CONCEPTION DU MODULE DE SUIVI (Run Test Cases) ............................... 52
    4.3.2 MISE EN ŒUVRE (Dashboard Temps RÉEL et Cycle de Vie Bug) .................. 54
4.4 CONCLUSION ....................................................................................................... 56

### CHAPITRE 5 : RELEASE 3 : INTELLIGENCE IA, PRÉDICTIF ET RECOMMANDEUR .. 57
5.1 INTRODUCTION ................................................................................................... 58
5.2 SPRINT 5 : AGENT ANALYTICS IA ET VISUALISATION DATA ................................... 58
    5.2.1 AGENT CONVERSATIONNEL (LLM Groq & Plotly.js) .................................. 59
    5.2.2 MISE EN ŒUVRE (Exploration des Données en Langage Naturel) ................ 61
5.3 SPRINT 6 : PRÉDICTIONS ML ET RECOMMANDATION DE TESTEURS ...................... 63
    5.3.1 ML TIMELINE GUARD ET RELEASE READINESS SCORE ................................ 64
    5.3.2 MOTEUR DE RECOMMANDATION DE TESTEURS (Optimisation ML) ........... 66
    5.3.3 MISE EN ŒUVRE (Catchup Plan IA et Rapports PDF Automatisés) ............. 68
5.4 CONCLUSION ....................................................................................................... 70

### CHAPITRE 6 : INFRASTRUCTURE DEVOPS ET AUTOMATISATION QUALITÉ ........ 71
6.1 STRATÉGIE DE DÉPLOIEMENT ET CI/CD ................................................................ 72
    6.1.1 CONTENEURISATION VIA DOCKER .............................................................. 73
    6.1.2 PIPELINE D'INTÉGRATION ET DÉPLOIEMENT CONTINU (GitHub) ............. 75
6.2 AUTOMATISATION DE LA QUALITÉ (E2E TESTING) ............................................... 77
    6.2.1 INTRODUCTION À PLAYWRIGHT ............................................................... 78
    6.2.2 RÉALISATION DES SCRIPTS DE TESTS (Login, Dashboard, Execution) ........ 80
    6.2.3 INTÉGRATION DES SCRIPTS DANS LE PIPELINE CI ..................................... 82
6.3 BILAN FINAL DU PROJET ...................................................................................... 84

**CONCLUSION GÉNÉRALE ET PERSPECTIVES ............................................................... 86**

**BIBLIOGRAPHIE & WEBOGRAPHIE**
**ANNEXES**
