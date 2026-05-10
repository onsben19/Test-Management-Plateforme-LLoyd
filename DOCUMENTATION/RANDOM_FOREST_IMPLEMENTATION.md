# 🌲 Guide Technique : Implémentation du Modèle Random Forest

Ce document détaille l'implémentation complète (de bout en bout) du modèle de Machine Learning `RandomForestRegressor` utilisé dans InsureTM pour prédire les dates de fin de campagnes de tests et générer des alertes prédictives (Timeline Guard).

---

## 1. Entraînement du Modèle (`train_model.py`)

Le modèle est entraîné hors ligne. Son but est d'apprendre la relation entre l'état d'avancement d'une campagne et le nombre de jours nécessaires pour la terminer, tout en prenant en compte les variations de rythme naturel d'une équipe.

**Fichier :** `InsureTM/research/train_model.py`

### 1.1 Génération du Dataset (Features & Target)
Le modèle se base sur 4 features principales (entrées) pour prédire une "Target" (la sortie) :
```python
# Features (Entrées)
'total_cases'    # Nombre total de tests dans la campagne
'finished_cases' # Nombre de tests déjà exécutés (statut PASSED/FAILED)
'days_elapsed'   # Jours écoulés depuis le début de la campagne
'velocity'       # Ratio = finished_cases / days_elapsed

# Target (Sortie à prédire)
'days_remaining' # Jours restants nécessaires pour terminer
```

*Remarque technique : Lors de l'entraînement, un bruit statistique Gaussien (`np.random.normal(0, 1.5)`) est injecté dans la Target pour forcer le Random Forest à généraliser l'imprévisibilité humaine (congés, bugs inattendus, etc.), évitant ainsi un surapprentissage (overfitting) sur un simple calcul linéaire.*

### 1.2 Hyperparamètres du Modèle
L'algorithme choisi est le `RandomForestRegressor` de la librairie **scikit-learn**.
```python
model = RandomForestRegressor(n_estimators=100, random_state=42)
```
- **`n_estimators=100`** : Le modèle génère 100 arbres de décision différents. Chaque arbre fait une prédiction, et la réponse finale du modèle est la moyenne de ces 100 arbres, garantissant une forte stabilité.
- L'export est réalisé via `joblib.dump()` pour produire le binaire `timeline_model.joblib`.

---

## 2. Intégration Backend (Le Service d'Inférence)

Une fois entraîné, le modèle doit être interrogé par le serveur web (Django). 

**Fichier :** `InsureTM/analytics/ml_service.py` (Classe `MLTimelineGuard`)

### 2.1 Caching du Modèle (Optimisation RAM)
Pour éviter de lire le fichier `.joblib` du disque dur à chaque requête HTTP (ce qui serait désastreux pour les performances), le modèle est chargé une seule fois et conservé dans la RAM grâce à des variables de classe (`_cached_model`).
```python
class MLTimelineGuard:
    _cached_model = None  # Garde le modèle en mémoire RAM

    def __init__(self):
        if MLTimelineGuard._cached_model is None:
            MLTimelineGuard._cached_model = joblib.load(self.model_path)
```

### 2.2 Extraction des Données en Temps Réel
Quand une prédiction est demandée pour l'ID d'une campagne (`get_campaign_status(campaign_id)`), le système interroge PostgreSQL :
```python
total_cases = campaign.nb_test_cases
finished_count = TestCase.objects.filter(campaign=campaign).count()
days_elapsed = (timezone.now().date() - start_date).days
velocity = finished_count / max(1, days_elapsed)
```

### 2.3 L'Inférence (Prédiction) et ses Garde-Fous
C'est ici que l'intelligence artificielle agit. On passe les données sous forme de DataFrame Pandas au modèle.
```python
input_df = pd.DataFrame([{
    'total_cases': total_cases,
    'finished_cases': finished_count,
    'days_elapsed': days_elapsed,
    'velocity': velocity
}])

# Prédiction brute du modèle ML
days_needed_ml = math.ceil(self.model.predict(input_df)[0])
```

**⚠️ Le Garde-Fou (Fallback de sécurité)** : 
Le Machine Learning peut faire des erreurs de projection sur de très petits échantillons (ex: une campagne de seulement 5 tests). Pour contrer cela, le code calcule en parallèle la projection linéaire "stricte" :
```python
linear_days = math.ceil( (total_cases - finished_count) / velocity )
days_needed = min(days_needed_ml, linear_days) # Retenir le scénario le plus rapide
```
Si le fichier de modèle est supprimé ou corrompu, le système "Fallback" automatiquement sur le modèle mathématique linéaire, évitant ainsi le crash du serveur 500.

---

## 3. Détermination du Risque & Exposition API

**Fichier :** `InsureTM/analytics/views.py`

Une fois le nombre de "jours restants prédits" obtenu, le backend le compare à la `estimated_end_date` (la deadline officielle).

Le calcul génère l'un des 5 statuts suivants :
1. **`INITIAL`** : `total_cases == 0` (Erreur de configuration).
2. **`WAITING`** : Campagne démarrée il y a moins de 24h, aucune donnée pour calculer une vélocité.
3. **`OPTIMAL`** : Date prédite ≤ Deadline.
4. **`WARNING`** : Date prédite dépasse la Deadline d'un délai compris entre 1 et 5 jours.
5. **`CRITICAL`** : La date prédite est hors délai de plus de 5 jours.

### Endpoint Exposé
L'URL `GET /api/analytics/timeline-guard/<id>/` renvoie la prédiction finale encapsulée, incluant le verdict généré en parallèle par le LLM (Llama-3).

---

## 4. Consommation Frontend (React)

Le frontend récupère ces données pour ajuster l'interface utilisateur dynamiquement.

**Composant concerné :** Affichage dans le widget `AI Forecast Visibility` (Manager Dashboard & ProjectStatusCard).

1. Le frontend appelle le service : `analyticsService.getTimelineGuardStatus(id)`
2. Selon le champ `status` renvoyé par l'API :
   - `OPTIMAL` applique des classes CSS d'alerte verte (ex: `bg-emerald-500/10 text-emerald-400`).
   - `CRITICAL` déclenche des animations de pulsation rouges (ex: `animate-pulse text-rose-500`).
3. Le `delay_days` (nombre de jours de retard prédit) est affiché sous forme d'étiquette d'avertissement.
4. En cas de statut `CRITICAL` ou `WARNING`, le bouton d'action contextuel `"Générer un Plan de Rattrapage"` est débloqué pour l'utilisateur, ce qui fera appel au `CatchupRecommendationManager`.

---

## 5. Résumé de la Chaîne d'Exécution

1. **Hors ligne** : Entraînement avec bruit synthétique via `train_model.py` ➔ `timeline_model.joblib`.
2. **Boot Serveur** : Le `MLTimelineGuard` charge le binaire en mémoire.
3. **Requête Client** : L'API reçoit l'appel pour une campagne `X`.
4. **ORM** : Récupération des compteurs (total tests, finished tests).
5. **Inférence ML** : Le modèle ingère les 4 valeurs et recrache la durée estimée.
6. **Contrôle Logique** : Comparaison avec la deadline officielle pour déduire le risque (`WARNING`, `CRITICAL`...).
7. **UI** : React met à jour le HUD avec les jauges d'alertes colorées associées.
