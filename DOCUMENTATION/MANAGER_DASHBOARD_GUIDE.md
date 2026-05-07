# 📊 Guide Complet : Tableau de Bord Manager (Historical Analytics)

Ce document explique en détail le fonctionnement du **Tableau de Bord Manager** de la plateforme InsureTM. Il détaille la provenance de chaque métrique, comment les calculs sont effectués en backend, et ce que chaque chiffre signifie pour le pilotage de la qualité.

---

## 1. Vue d'Ensemble et Résumé (Dashboard Brief)
En haut du tableau de bord se trouve un résumé global des performances généré dynamiquement et enrichi par l'IA.

### Métriques Clés :
*   **Total Campagnes** : Le nombre total d'objets `Campaign` enregistrés dans le système.
*   **Anomalies Ouvertes** : Le nombre total d'objets `Anomalie` dont le statut n'est **pas** `RESOLUE`.
*   **Anomalies Critiques** : Parmi les anomalies ouvertes, celles dont le niveau d'impact est strictement égal à `CRITIQUE` ou `BLOQUANTES`.
*   **Moyenne Globale de Préparation (Readiness Score)** : 
    *   *Calcul* : Le système récupère les **5 dernières campagnes actives**. Pour chacune, il exécute le `ReleaseReadinessManager` (algorithme ML + Heuristique) pour obtenir un score sur 100. La Moyenne Globale est simplement la moyenne arithmétique de ces 5 scores.
    *   *Utilité* : Donne une note instantanée (ex: 82%) sur la confiance globale de mise en production à l'échelle du projet.

---

## 2. Onglet : Comparatif Qualité des Releases
Cet onglet permet de suivre l'évolution de la qualité technique entre les différentes versions (releases) de l'application.

### A. Tableau Récapitulatif (ou Carrousel)
*   **Release** : Le nom ou la version de la campagne (préfixé par l'initiale du projet).
*   **Taux de Succès (%)** :
    *   *Calcul* : `(Nombre de cas de tests PASSED) / (Nombre Total de tests) × 100`.
    *   *Origine du "Nombre Total"* : Si un objectif (`nb_test_cases`) a été fixé à la création de la campagne, il est utilisé. Sinon, le système compte dynamiquement le nombre de lignes `TestCase` importées dans la campagne.
    *   *Attention* : Les tests `FAILED`, `BLOCKED`, ou non exécutés (`PENDING`) pénalisent ce taux.
*   **Anomalies Signalées** : Le nombre exact de bugs (`Anomalie`) qui ont été déclarés ou liés aux tests de cette campagne spécifique.
*   **Statut Qualité** :
    *   **Stable (Vert)** : Taux de succès ≥ 80%.
    *   **À risque (Orange)** : Taux de succès entre 60% et 79%.
    *   **Critique (Rouge)** : Taux de succès < 60%.

### B. Graphique Comparatif (ComposedChart)
*   **Axe X (Bas)** : Le nom de la release (tronqué si trop long pour éviter le chevauchement).
*   **Ligne Bleue (Axe Y Gauche)** : Évolution du Taux de succès.
*   **Barres Rouges (Axe Y Droite)** : Volume d'anomalies signalées.
*   *Utilité* : Permet de repérer visuellement les corrélations. Par exemple, une chute de la ligne bleue (succès) coïncide généralement avec un pic des barres rouges (anomalies).

---

## 3. Onglet : Performance de l'Équipe (Testers)
Cet onglet trace la performance individuelle des testeurs à travers le temps, pour identifier ceux en difficulté et les plus performants.

*   **Testeur** : Nom complet du testeur (ou identifiant) basé sur les exécutions de tests.
*   **Taux de Succès Actuel** : Le taux de succès de ce testeur sur la toute **dernière release** à laquelle il a participé.
*   **Vélocité Moyenne** :
    *   *Calcul* : `(Nombre d'exécutions de tests) / (Durée de la campagne en jours)`.
    *   *Interprétation* : Le nombre de tests exécutés par jour par ce testeur.
*   **Tendance (Trend)** :
    *   *Calcul* : `(Taux de succès de sa dernière release) - (Taux de succès de sa toute première release)`.
    *   **En Progression (Improving)** : Différence > +5%.
    *   **Stable** : Différence entre -5% et +5%.
    *   **En Déclin (Declining)** : Différence < -5%.

---

## 4. Onglet : Santé des Modules (Module Health)
Permet d'identifier les parties (modules) du logiciel les plus fragiles.

*   **Module Name** : Extrait automatiquement des données JSON importées (champs "Module" ou "Domaine"). Si non trouvé, catégorisé dans "Core".
*   **Fail Rate (Taux d'Échec)** :
    *   *Calcul* : `(Nombre de tests FAILED dans ce module) / (Nombre total de tests dans ce module) × 100`.
*   **Statut du Module** :
    *   **Critique (Rouge)** : Fail Rate > 30%. (Nécessite une refonte du code ou un audit approfondi).
    *   **Alerte (Orange)** : Fail Rate > 15%. (À surveiller de près).
    *   **Sain (Vert)** : Fail Rate ≤ 15%.
*   **Releases Impactées** : Le nombre de campagnes différentes dans lesquelles ce module a posé problème ou a été testé.

---

## Conclusion
Ce tableau de bord ne repose sur aucune donnée aléatoire. Chaque chiffre est une extraction en temps réel de la base de données PostgreSQL, croisant les objets `Campaign`, `TestCase`, et `Anomalie`, permettant aux managers de prendre des décisions d'allocation de ressources objectives (ex: assigner plus de testeurs sur un module "Critique").
