# Guide Technique : Dashboard Analytics Historique

Ce document explique le fonctionnement du dashboard d'analytics historiques d'InsureTM, de l'agrégation des données en backend à la visualisation premium en frontend.

## 1. Vue d'Ensemble
Le dashboard fournit trois axes majeurs d'analyse :
- **Qualité (Pass Rate)** : Évolution du taux de réussite sur les dernières releases.
- **Vélocité (Testers)** : Performance et régularité des testeurs individuels.
- **Santé des Modules** : Identification des zones à risques (modules avec fort taux d'échec).

## 2. Modes d'Affichage
Le dashboard supporte deux modes de fonctionnement :
- **Mode Projet** : Filtre les données pour un projet spécifique via `project_id`.
- **Mode Global (Plateforme)** : Agrège les données de tous les projets actifs. Dans ce mode, les versions sont préfixées par les initiales du projet (ex: `FR - v1.0`).

## 3. Backend (Django API)
Trois endpoints dédiés dans `analytics/views.py` alimentent l'interface :

### a. `/api/analytics/releases/`
Calcule les métriques par campagne (release) :
- **Pass Rate** : `(Tests réussis / Total tests) * 100`.
- **Vélocité** : Nombre de tests exécutés par jour.
- **Anomalies** : Nombre de bugs liés à la campagne.

### b. `/api/analytics/testers/`
Analyse le parcours des testeurs :
- **Trends** : Comparaison du pass rate entre la première et la dernière release (`improving`, `stable`, `declining`).
- **Spark-Bars** : Historique visuel compact des 5 dernières performances.

### c. `/api/analytics/modules/`
Cet endpoint identifie la "dette technique" par zone fonctionnelle.

- **Parsing Polymorphe (data_json)** : Le backend analyse le champ `data_json` de chaque `TestCase` pour extraire le nom du module. Il gère deux structures :
  1. **Dictionnaire direct** : `{"Module": "Paiement", ...}`
  2. **Liste de dictionnaires** : `[{"key": "Module", "value": "Paiement"}, ...]`
- **Logique de Détection** : Le système cherche les clés dans cet ordre de priorité : `Module` > `Domaine` > `Feature`. Si aucune n'est trouvée, il affecte le test au module par défaut `Core`.
- **Calcul du Risque (Fail Rate)** : Le score est la moyenne du taux d'échec sur les 6 dernières releases.
- **Seuils de Santé (Indicateurs)** :
  - 🔴 **Échec (Critical)** : Taux d'échec > 30%. Le module nécessite une refonte ou une attention immédiate.
  - 🟡 **Stable (Warning)** : Taux d'échec entre 15% et 30%. Zone sous surveillance.
  - 🟢 **Bon (Healthy)** : Taux d'échec < 15%. Module considéré comme fiable.
  
## 4. Frontend (React & Recharts)
Le composant `HistoricalAnalyticsDashboard.tsx` utilise :
- **Recharts** : Pour le BarChart principal avec un dégradé de couleurs premium.
- **Framer Motion** : Pour les animations fluides des onglets et des barres de progression.
- **SparkBars** : Un composant personnalisé pour afficher les mini-tendances des testeurs.
- **Aggregator Logic** : Calcule les moyennes globales et les deltas directement en frontend pour une réactivité maximale.

## 5. Maintenance & Débogage
En cas d'erreur 500 :
1. Vérifier la validité du JSON dans `data_json` de la table `testCases`.
2. S'assurer que les campagnes sont liées à des projets valides.
3. Consulter les logs via `docker logs insuretm-backend` pour intercepter les `AttributeError`.
