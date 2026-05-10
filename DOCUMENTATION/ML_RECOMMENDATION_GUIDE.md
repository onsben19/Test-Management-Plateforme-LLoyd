# 🧠 Guide : Système de Recommandation ML (Allocation des Testeurs)

Ce document détaille le fonctionnement du système de recommandation basé sur le Machine Learning déterministe pour l'allocation des ressources (Testeurs) au sein d'InsureTM.

Ce système permet d'identifier automatiquement les meilleurs profils à affecter à une campagne en retard, en se basant sur la performance historique, la fiabilité et la charge de travail actuelle.

---

## 1. Vue d'Ensemble de l'Architecture

Le système a été refactoré pour abandonner les recommandations génératives (LLM) au profit d'un système **déterministe et mesurable**, divisé en deux composants :

1. **Le Moteur de Scoring ML (`score_tester`)** : Évalue la performance absolue d'un testeur.
2. **Le Gestionnaire de Recommandation (`CatchupRecommendationManager`)** : Analyse le besoin d'une campagne et sélectionne les meilleurs candidats.

---

## 2. Le Moteur de Scoring ML (`score_tester`)

**Fichier :** `InsureTM/analytics/ml_service.py` (Classe `MLTimelineGuard`)

La méthode `score_tester` génère un score d'aptitude de **0 à 100** pour chaque testeur. Ce score est calculé selon trois "features" pondérées. Voici les formules mathématiques exactes utilisées dans l'algorithme :

### 2.1 Formules de Calcul des Variables

#### A. Le Taux de Succès (Poids : 40%)
Représente la qualité des tests exécutés historiquement par le testeur (indique son niveau de maîtrise).
```text
Success Rate = ( Nombre de Tests "PASSED" / Nombre Total de Tests assignés au testeur ) * 100
```

#### B. La Vélocité Récente (Poids : 30%)
Représente la capacité de production récente du testeur (mesurée sur les 7 derniers jours).
Le calcul considère qu'une cadence optimale ("100 points") correspond à 10 tests par jour.
```text
Recent Tests = Nombre de tests exécutés par le testeur dans les 7 derniers jours
Vélocité = (Recent Tests / 7 jours)
Velocity Score = MIN(100, Vélocité * 10)
```

#### C. La Fiabilité (Poids : 30%)
Représente la régularité et la présence du testeur sur la plateforme. On compte le nombre de jours uniques où le testeur a exécuté au moins 1 test au cours des 14 derniers jours.
```text
Active Days = Nombre de jours uniques d'activité sur les 14 derniers jours
Reliability Score = (Active Days / 14 jours) * 100
```

### 2.2 Formule du Score Final ML

L'algorithme fusionne ces trois métriques en appliquant leur coefficient de pondération respectif :
```text
ML Final Score = (Success Rate × 0.40) + (Velocity Score × 0.30) + (Reliability Score × 0.30)
```

### 2.3 Classification des Profils (Labels)

En fonction du `ML Final Score` obtenu, le système attribue automatiquement une étiquette de compétence :

- **`EXPERT`** : `Score > 80` (Performant, très régulier et rapide).
- **`STABLE`** : `Score > 50` (Performance correcte dans la moyenne).
- **`TRAINEE`** : `Score ≤ 50` (Débutant ou taux d'échec élevé).
- **`NEUTRAL`** : Attribué aux nouveaux testeurs sans aucun historique de test (Score forcé à `50.0`).

---

## 3. Le Gestionnaire de Rattrapage (`CatchupRecommendationManager`)

**Fichier :** `InsureTM/analytics/recommendation_service.py`

Ce service est appelé pour créer un "Plan d'Action" afin de rattraper un retard prédit par le modèle RandomForest de `MLTimelineGuard`.

### 3.1 Détermination du Besoin (Delta Vélocité)
Pour savoir de combien de renforts nous avons besoin, le système calcule le retard de la cadence.

**Formules :**
```text
Remaining Tests = max(0, Total Tests - Finished Tests)
Days Left = max(1, Target Date - Today)  // Fixé à 1 minimum pour éviter la division par zéro

Required Velocity = Remaining Tests / Days Left
Current Velocity = (Fournie par la prédiction du RandomForest)

Delta Velocity = max(0, Required Velocity - Current Velocity)
```
> Le **Delta Velocity** représente le nombre exact de tests **supplémentaires** par jour que l'équipe doit exécuter pour finir dans les temps.

### 3.2 Filtrage des Candidats (Renforts)
Le système calcule la charge actuelle de tous les utilisateurs (rôle `TESTER`) pour prévenir le burnout.

**Formule de Charge Actuelle (`Current Load`) :**
```text
Current Load = Nombre de tests exécutés par le testeur dans les 3 derniers jours / 3
```

Pour être éligible comme "Renfort" (ajouté à la liste `potential_reinforcements`), un testeur doit répondre à ces critères stricts :
1. **Disponibilité** : `Current Load ≤ 8` (Le testeur n'est pas surchargé de travail).
2. **Non-Redondance** :
   - SOIT le testeur n'est pas du tout assigné à la campagne actuelle.
   - SOIT le testeur est assigné, **MAIS** il a terminé son quota personnel (`Total Done >= Test Quota`).

### 3.3 Algorithme de Tri et Distribution (Sélection Intelligente)
Les candidats éligibles sont triés selon l'ordre de priorité suivant :
```python
potential_reinforcements.sort(key=lambda x: (-x['ml_score'], x['current_load']))
```
*(Privilégie d'abord le score ML le plus élevé. En cas d'égalité, privilégie le testeur ayant la plus faible charge actuelle).*

**La Distribution (Assignation du travail) :**
Le système sélectionne les **2 meilleurs candidats** de cette liste triée. Il divise ensuite équitablement le `Delta Velocity` entre eux.
```text
Nombre de cibles = min(2, Nombre de candidats disponibles)
Tests quotidiens supplémentaires recommandés par testeur = Delta Velocity / Nombre de cibles
```

---

## 4. Format de la Réponse API

L'endpoint de l'API retourne le JSON suivant, exploité par le frontend pour afficher les cartes de recommandation :

```json
{
  "campaign_id": 42,
  "delay_days": 3,
  "current_velocity": 4.5,
  "required_velocity": 8.0,
  "tester_distribution": [
    {
      "id": 12,
      "name": "Jean D.",
      "current_load": 2.3,
      "is_overloaded": false,
      "ml_score": 85.4,
      "ml_label": "EXPERT",
      "status": "RECOMMENDED",
      "recommended_extra": 1.8
    },
    {
      "id": 14,
      "name": "Marie L.",
      "current_load": 1.0,
      "is_overloaded": false,
      "ml_score": 68.2,
      "ml_label": "STABLE",
      "status": "RECOMMENDED",
      "recommended_extra": 1.7
    }
  ],
  "recommendation_engine": "ML Performance Model v1.0"
}
```

---

## 5. Avantages Architecturaux

1. **Mathématiques Pures vs Hallucination** : Toutes les décisions sont basées sur des ratios concrets (`Success Rate`, `Velocity Score`) éliminant le risque de "hallucination" qu'aurait pu avoir un LLM.
2. **Prévention Santé Mentale (Burnout)** : La formule `Current Load > 8` est un garde-fou codé en dur qui garantit que l'outil de gestion n'ajoutera jamais de la charge à un testeur déjà débordé, même si c'est un "Expert".
3. **Récompense de la Productivité** : En permettant à un testeur ayant accompli son quota personnel d'être sélectionné comme renfort (avec le statut valorisant d'EXPERT), l'algorithme promeut une dynamique d'équipe saine.
4. **Résilience Logicielle** : La méthode de calcul de score `score_tester` est entièrement encapsulée dans un bloc `try/except`. Ainsi, si une donnée en base est corrompue, manquante, ou si un utilisateur n'existe plus, le backend ne crashera pas (Erreur 500). L'application absorbera l'erreur silencieusement et renverra un score neutre par défaut de `50`, garantissant la haute disponibilité du service.
