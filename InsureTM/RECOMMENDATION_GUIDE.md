# 📑 Documentation Technique Approfondie : Moteur de Recommandation ML

Ce document fournit les détails mathématiques et fonctionnels précis du système de recommandation d'InsureTM.

---

## 🧮 1. Les Équations du Modèle ML

Le système utilise plusieurs couches de calcul pour transformer les données brutes en décisions.

### A. Scoring de Performance (Fitness Score)
Le score final d'un testeur est une moyenne pondérée de trois indicateurs clés.

**Équation Finale :**
`Score_Final = (Rate_Success * 0.4) + (Score_Velocity * 0.3) + (Score_Reliability * 0.3)`

1.  **Taux de Succès (Rate_Success)** :
    `Rate_Success = (Tests PASSED / Total Tests) * 100`

2.  **Score de Vélocité (Score_Velocity)** :
    Mesure la rapidité récente. Le référentiel de performance maximale est fixé à **10 tests/jour**.
    `Score_Velocity = MIN(100, (Tests sur 7 jours / 7) * 10)`

3.  **Score de Fiabilité (Score_Reliability)** :
    Mesure la présence constante sur la plateforme.
    `Score_Reliability = (Jours actifs sur 14 derniers jours / 14) * 100`

### B. Algorithme de Rattrapage (Catchup Logic)
Calcul de l'effort nécessaire pour respecter les délais.

1.  **Vélocité Requise (V_req)** :
    `V_req = Nombre de tests restants / Jours restants avant la deadline`

2.  **Charge Actuelle du Testeur (L_curr)** :
    Moyenne glissante sur 3 jours pour détecter la surcharge immédiate.
    `L_curr = Tests exécutés sur 3 derniers jours / 3`

3.  **Distribution du Retard (Extra_tests)** :
    Si V_req > V_actuelle, le surplus est divisé entre les 2 meilleurs testeurs **non-saturés** (L_curr < 8).
    `Extra_tests = (V_req - V_actuelle) / 2`

---

## 🖥️ 2. Guide de l'Interface Utilisateur (UI)

Chaque élément de l'interface "Optimiseur Stratégique" a une fonction précise.

### 🔝 En-tête (Header)
-   **Expert Connecté** : Indique que le service Groq/Llama-3 est actif pour l'analyse sémantique.
-   **Badge de Retard** (ex: +16j) : Calculé par le modèle ML en comparant la date de fin projetée à la date cible.

### 🎯 Section "Objectif Requis"
-   **Grand Nombre Central** : Affiche la Vélocité Requise. C'est la cible que l'équipe doit atteindre.
-   **Indicateur "Actuel"** : Affiche la vélocité réelle actuelle. L'écart avec la cible justifie les recommandations.
-   **Jours Restants** : Compte à rebours réel avant la deadline.
-   **Barre de Progression** : Pourcentage de complétion de la campagne.

### 👥 Section "Répartition des Ressources"
-   **Cartes Testeurs** :
    -   **Initiales** : Identifiant visuel.
    -   **Charge t/j** : Affiche la charge actuelle (L_curr).
    -   **Score ML & Label** : Affiche le score de fitness et sa qualification (Expert, Stable, Trainee).
-   **Barre d'Optimisation** :
    -   *Gris foncé* : Charge de travail actuelle.
    -   *Bleu Indigo (animé)* : La charge supplémentaire recommandée.
-   **Status Badge** :
    -   `Saturé` (Rouge) : Si Charge > 8 tests/j.
    -   `Recommandé` (Vert) : Testeur apte à recevoir plus de travail.

---

## 🧪 3. Scénario de Test pour l'Encadrant (DÉMO)

**Objectif** : Prouver que l'IA ne choisit pas au hasard mais optimise sous contraintes réelles via le scoring et la répartition de charge.

1.  **Démarrer avec `tester_expert`** : Montrez qu'il a un score de 100 et que le système lui attribue visuellement une barre d'optimisation bleue (travail supplémentaire recommandé) car il est efficace.
2.  **Observer `tester_overloaded`** : Montrez qu'il a un bon score mais que le système **ne lui propose aucune optimisation** car il est déjà à 10 tests/jour (protection de la ressource).
3.  **Vérifier `tester_low`** : Montrez qu'il n'est pas choisi pour un surplus de travail car son taux de succès est trop bas (~40%).
4.  **Conclusion** : Expliquez que le dashboard permet au Manager de ré-allouer les ressources manuellement en se basant sur ces indicateurs de performance précis.
