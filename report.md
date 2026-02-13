# Rapport Technique : Implémentation de l'Agent Analytics Intelligent

Ce document détaille l'architecture et les étapes techniques réalisées pour intégrer l'Agent Analytics utilisant l'API Groq (Llama 3) dans l'application InsureTM.

## 1. Architecture Globale

L'agent agit comme un pont entre le langage naturel de l'utilisateur et la base de données PostgreSQL.

*   **Frontend (React)** : Interface de chat (`AnalyticsChatWidget`) intégrée dans une page dédiée (`Analytics.tsx`).
*   **Backend (Django)** : API REST (`AskAgentView`) qui reçoit la question.
*   **Intelligence (Groq API)** : Le service `GroqService` traduit la question en requête SQL en utilisant le modèle `llama-3.3-70b-versatile`.
*   **Base de Données (PostgreSQL)** : Exécution de la requête SQL générée pour récupérer les données réelles.

---

## 2. Implémentation Backend (`analytics` app)

### a. Création du Service Groq (`groq_service.py`)
Le cœur du système est la classe `GroqService`.
*   **Prompt Engineering** : Nous fournissons au LLM le schéma *exact* de la base de données (noms des tables comme `anomalies_anomalie`, `testCases_testcase`, noms des colonnes `titre`, `criticite`, etc.).
*   **Conversion NL-to-SQL** : Le prompt demande explicitement de retourner *uniquement* du SQL valide sans markdown.
*   **Exécution Sécurisée** : Utilisation de `django.db.connection` pour exécuter le SQL brut et retourner les résultats sous forme de liste de dictionnaires.

### b. API Endpoint (`views.py`)
Une vue `AskAgentView` (APIView) protégée par `IsAuthenticated`.
*   Reçoit `{ "query": "..." }`.
*   Instancie `GroqService`.
*   Retourne `{ "answer": "...", "data": [...], "sql": "...", "type": "bar/table" }`.

### c. Configuration
*   Mise à jour de `settings.py` pour inclure l'app `analytics`.
*   Ajout des routes dans `urls.py`.

---

## 3. Implémentation Frontend (React)

### a. Composant Chat (`AnalyticsChatWidget.tsx`)
Un composant riche capable d'afficher :
*   Texte simple.
*   **Visualisations graphiques** : Utilisation de `recharts` pour générer automatiquement des BarCharts ou LineCharts selon les données reçues.
*   **Mode "Embedded"** : Modification du composant pour supporter un mode "intégré" (plein écran dans un conteneur) en plus du mode "flottant" original.

### b. Page Dédiée (`Analytics.tsx`)
Création d'une nouvelle page qui :
*   Intègre le `Sidebar` et `Header`.
*   Contient le `AnalyticsChatWidget` en mode `embedded={true}`.

### c. Routing
*   Ajout de la route `/analytics` dans `App.tsx`.
*   Ajout du lien "Analytics IA" dans `Sidebar.tsx` avec l'icône `Brain`.

---

## 4. Défis Techniques et Résolutions

### a. Dépréciation du Modèle Groq
*   **Problème** : Le modèle `llama3-70b-8192` n'était plus disponible.
*   **Solution** : Migration vers `llama-3.3-70b-versatile` dans `groq_service.py`.

### b. Erreurs de Schéma SQL
*   **Problème** : L'IA générait des requêtes sur `anomalies_anomaly` (singulier standard Django) alors que la table réelle était `anomalies_anomalie` (nommage spécifique ou legacy).
*   **Solution** : Analyse des `models.py` et mise à jour du contexte fourni au LLM pour refléter exactement les noms de tables et colonnes (`criticite` vs `severity`).

### c. Problèmes de Connexion (Port 8000)
*   **Problème** : Erreur "Connection refused" et "Port already in use".
*   **Solution** : Identification et arrêt du processus bloquant (`kill -9 PID`), puis redémarrage propre du serveur Django.

### d. Absence de Données
*   **Problème** : Les requêtes fonctionnaient mais retournaient "Aucune donnée".
*   **Solution** : Création d'un script de seed (`seed_anomalies.py`) pour injecter des données de test (Projet, Campagne, Anomalies critiques, etc.).
