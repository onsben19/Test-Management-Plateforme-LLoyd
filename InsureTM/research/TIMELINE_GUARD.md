# Timeline Guard — Comment ça marche ?

Guide simple pour comprendre le modèle de prédiction des retards de campagne dans InsureTM.

---

## 1. À quoi ça sert ?

**Timeline Guard** estime **combien de jours il reste** pour terminer une campagne de tests, et compare cette date à la **deadline** prévue.

Le manager voit ainsi si la campagne est :
- **OPTIMAL** — dans les temps
- **WARNING** — risque de retard modéré
- **CRITICAL** — retard important

---

## 2. Le principe en 4 étapes

```
Campagne en cours
       │
       ▼
① Calculer la vélocité (rythme de tests/jour)
       │
       ▼
② Projection linéaire → Dl (jours restants simples)
       │
       ▼
③ Random Forest → Dml (jours restants appris par ML)
       │
       ▼
④ Garde-fou → Dp = min(Dml, Dl)  →  date de fin projetée
```

---

## 3. Les données utilisées

Pour chaque campagne, le système lit dans PostgreSQL :

| Donnée | Signification |
|--------|---------------|
| **Ct** | Nombre total de cas de test |
| **Cf** | Cas déjà exécutés (PASSED ou FAILED, pas PENDING) |
| **De** | Jours écoulés depuis la **première exécution** |
| **Deadline** | Date de fin prévue (`estimated_end_date`) |

---

## 4. La vélocité (rythme de travail)

La vélocité = **nombre de tests par jour**.

InsureTM ne prend pas une seule moyenne : il retient le **maximum** entre :
- la moyenne depuis le début ;
- la moyenne sur les **7 derniers jours** ;
- la moyenne sur les **3 derniers jours** ;
- le nombre de tests faits **aujourd'hui**.

→ Si l'équipe accélère récemment, la projection s'adapte.

---

## 5. Projection linéaire (Dl)

Formule simple :

```
Dl = ⌈ (Ct − Cf) / V ⌉
```

Exemple : 60 tests restants, 12 tests/jour → **Dl = 5 jours**.

C'est le calcul « à la main » : rapide, mais il ignore la complexité réelle.

---

## 6. Le modèle Random Forest (Dml)

### Qu'est-ce que c'est ?

Un **Random Forest** est un algorithme de Machine Learning (Scikit-Learn) qui apprend à prédire un **nombre** (ici : jours restants) à partir de plusieurs indicateurs.

### Entraînement

Fichier : `research/train_model.py`

1. Génère **1000 campagnes simulées** (données synthétiques)
2. Pour chaque campagne, calcule combien de jours il reste
3. Entraîne un `RandomForestRegressor` (100 arbres de décision)
4. Sauvegarde le modèle dans **`research/timeline_model.joblib`**

Précision mesurée : **R² ≈ 0,99** sur les données de test.

### Ce que le modèle reçoit en entrée (4 variables)

| Variable | Description |
|----------|-------------|
| `total_cases` | Total de tests dans la campagne |
| `finished_cases` | Tests déjà faits |
| `days_elapsed` | Jours depuis le début |
| `velocity` | Cf / De (vélocité simple) |

### Ce qu'il prédit

**Dml** = nombre de jours restants estimés par le ML (arrondi au supérieur).

### Où c'est utilisé dans le code ?

Fichier : `analytics/ml_service.py`  
Méthodes : `_predict_ml_days()` → `_combine_projections()` → `get_campaign_status()`

---

## 7. Le garde-fou : Dp = min(Dml, Dl)

La date finale retenue utilise **le plus petit** des deux estimations :

```
Dp = min(Dml, Dl)
```

**Pourquoi ?**  
- Le linéaire peut être **trop optimiste** (il suppose un rythme constant).
- Le ML peut parfois **surestimer** (entraîné sur données synthétiques).
- Prendre le **minimum** = approche **prudente** pour alerter le manager tôt.

Exemple :
- Dl = 5 jours (linéaire)
- Dml = 9 jours (ML)
- **Dp = 5 jours** retenu

---

## 8. Statut de risque

Le système compare la **date projetée** à la **deadline** :

| Situation | Statut |
|-----------|--------|
| Fin avant la deadline | OPTIMAL |
| Légère dérive | WARNING |
| Retard > 5 jours | CRITICAL |
| Aucun test exécuté | WAITING ou WARNING |

Un message IA (Groq) peut compléter l'analyse pour le manager.

---

## 9. Réponse API (extrait)

Quand on appelle `/api/analytics/timeline-guard/<id>/` :

```json
{
  "status": "OPTIMAL",
  "velocity": 10.0,
  "projected_end_date": "2026-07-15",
  "delay_days": 0,
  "progress": { "finished": 40, "total": 100, "percentage": 40.0 },
  "projection": {
    "linear_days": 5,
    "ml_days": 9,
    "combined_days": 5,
    "model_used": true
  }
}
```

---

## 10. Ce qu'il faut retenir pour le PFE / le jury

### En une phrase
> Timeline Guard combine une **projection linéaire** et un **Random Forest** pour estimer la fin d'une campagne, puis retient la **prévision la plus prudente** (`min(Dml, Dl)`).

### 5 points clés à dire à l'oral

1. **Objectif** — Anticiper les retards de campagne QA avant la deadline.
2. **Double approche** — Calcul mathématique simple + apprentissage automatique (Random Forest).
3. **Garde-fou** — `Dp = min(Dml, Dl)` évite une confiance aveugle dans une seule méthode.
4. **Vélocité adaptative** — Prise en compte des fenêtres récentes (3 j, 7 j, aujourd'hui).
5. **Intégration** — Modèle chargé depuis `timeline_model.joblib`, utilisé dans `ml_service.py`, affiché dans le Dashboard Manager.

### Limites honnêtes (si le jury demande)

- Le modèle est entraîné sur **données synthétiques** (pas encore sur l'historique Lloyd).
- Le RF complète le linéaire ; il ne remplace pas le jugement du manager.
- Le **Readiness Score** et le **Catch-up Plan** sont des modules **séparés** (voir section 5.6 du rapport).

---

## 11. Fichiers importants

| Fichier | Rôle |
|---------|------|
| `research/train_model.py` | Entraîne et sauvegarde le modèle |
| `research/timeline_model.joblib` | Modèle entraîné (binaire) |
| `analytics/ml_service.py` | Logique Timeline Guard en production |
| `analytics/readiness_service.py` | Score de maturité release (autre calcul) |
| `analytics/recommendation_service.py` | Plan de rattrapage + n8n |

---

## 12. Commandes utiles

```bash
# Entraîner le modèle (utiliser le venv !)
cd InsureTM
./venv/bin/python research/train_model.py

# Tester
./venv/bin/python manage.py test analytics.tests.MLTimelineGuardMLTest
```

---

*InsureTM — Lloyd Assurances · PFE ESPRIT 2025–2026*
