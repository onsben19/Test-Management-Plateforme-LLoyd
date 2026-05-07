# 🤖 Fonctionnalité Machine Learning — InsureTM

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture Générale](#2-architecture-générale)
3. [Composant 1 : ML Timeline Guard](#3-composant-1--ml-timeline-guard)
4. [Composant 2 : Agent Analytics (GroqService)](#4-composant-2--agent-analytics-groqservice)
5. [Composant 3 : Reformulation de Messages](#5-composant-3--reformulation-de-messages)
6. [Modèles de Données](#6-modèles-de-données)
7. [Endpoints API](#7-endpoints-api)
8. [Entraînement du Modèle ML](#8-entraînement-du-modèle-ml)
9. [Sécurité et Contrôle d'Accès](#9-sécurité-et-contrôle-daccès)
10. [Flux de Données (Diagrammes)](#10-flux-de-données-diagrammes)
11. [🐳 Configuration Docker](#11--configuration-docker)

---

## 1. Vue d'ensemble

Le module ML d'**InsureTM** intègre trois fonctionnalités d'intelligence artificielle distinctes dans la plateforme de gestion de tests :

| Fonctionnalité | Description | Technologie |
|---|---|---|
| **ML Timeline Guard** | Prédit la date de fin d'une campagne et son risque de retard | `RandomForestRegressor` (scikit-learn) + Groq LLM |
| **Agent Analytics** | Répond à des questions en langage naturel sur les données via SQL généré par IA | `Groq API` (Llama 3.3) |
| **Reformulation** | Reformule des messages email en langage professionnel | `Groq API` (Llama 3.3) |

Tous les appels LLM utilisent le modèle **`llama-3.3-70b-versatile`** via l'API **Groq** (ultra-rapide, gratuite).

---

## 2. Architecture Générale
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│  Dashboard → ML Guard | Chat → Analytics | Email → AI  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP REST API
┌───────────────────────▼─────────────────────────────────┐
│                  Django Backend (DRF)                    │
│   analytics/views.py                                    │
│   ├── CampaignTimelineGuardView  → ml_service.py        │
│   ├── AskAgentView               → groq_service.py      │
│   └── ReformulateMessageView     → groq_service.py      │
└─────────┬───────────────────────────┬───────────────────┘
          │                           │
┌─────────▼──────────┐    ┌───────────▼────────────┐
│  ML Local Model    │    │     Groq Cloud API      │
│  (RandomForest)    │    │  llama-3.3-70b-versatile│
│  timeline_model    │    │  (SQL gen + insights)   │
│  .joblib           │    │                         │
└────────────────────┘    └─────────────────────────┘
```

---

## 3. Composant 1 : ML Timeline Guard

### Fichier : `analytics/ml_service.py` — Classe `MLTimelineGuard`

C'est la **fonctionnalité ML principale**. Elle prédit si une campagne de tests va respecter sa deadline et génère un niveau de risque.

### 3.1 Fonctionnement Pas à Pas

```
Requête GET /analytics/timeline-guard/<campaign_id>/
                        │
                        ▼
         1. Récupère la campagne (Campaign model)
                        │
                        ▼
         2. Calcule les métriques de base :
            • total_cases      → Nombre total de tests
            • finished_count   → Tests exécutés (non PENDING)
            • days_elapsed     → Jours depuis le début
            • velocity         → finished_count / days_elapsed
                        │
                        ▼
         3. Inférence ML (si modèle chargé ET velocity > 0) :
            • Crée un DataFrame pandas avec les 4 features
            • model.predict(input_df) → jours restants prédits
            • Sécurité : min(ML_prediction, linear_days)
                        │
            Sinon : Fallback linéaire
            days_needed = remaining / velocity
                        │
                        ▼
         4. Calcule la date de fin projetée
            projected_end = today + timedelta(days=days_needed)
                        │
                        ▼
         5. Évalue le risque :
            • delay_days = projected_end - estimated_end_date
            • delay > 5 jours  → "CRITICAL"
            • delay > 0 jours  → "WARNING"
            • delay ≤ 0        → "OPTIMAL"
                        │
                        ▼
         6. Génère un insight IA via Groq (Llama 3.3)
                        │
                        ▼
         7. Retourne la réponse JSON formatée
```

### 3.2 Statuts Possibles

| Statut | Condition | Signification |
|--------|-----------|---------------|
| `INITIAL` | `total_cases == 0` | Aucun test défini dans la campagne |
| `WAITING` | `days_elapsed <= 1` et `velocity == 0` | Campagne tout juste démarrée |
| `OPTIMAL` | `delay_days <= 0` | La campagne est dans les temps |
| `WARNING` | `0 < delay_days <= 5` | Léger retard prévu |
| `CRITICAL` | `delay_days > 5` | Retard significatif prévu |

### 3.3 Features du Modèle ML

| Feature | Description | Exemple |
|---------|-------------|---------|
| `total_cases` | Nombre total de cas de test | `150` |
| `finished_cases` | Cas de test terminés (PASSED ou FAILED) | `45` |
| `days_elapsed` | Jours écoulés depuis le début | `10` |
| `velocity` | Vitesse d'exécution (tests/jour) | `4.5` |

**Target (ce que le modèle prédit) :** `days_remaining` — le nombre de jours restants estimé.

### 3.4 Exemple de Réponse API

```json
{
  "status": "WARNING",
  "velocity": 4.5,
  "projected_end_date": "2025-03-15",
  "delay_days": 3,
  "message": "Au rythme actuel, la campagne devrait se terminer le 15 mars avec un léger retard. Envisagez d'assigner des ressources supplémentaires.",
  "progress": {
    "finished": 45,
    "total": 150,
    "percentage": 30.0
  }
}
```

### 3.5 Insight IA (Groq)

Après la prédiction ML, un prompt est envoyé à **Groq** pour obtenir un conseil professionnel en français :

```python
prompt = f"""
Expert QA Platform Analyser.
Campaign: {title}
Progress: {finished}/{total}
Velocity: {velocity:.2f} tests/day
ML Projected End: {projected}
Deadline: {target}

Provide a very short professional advice (max 2 sentences) in French.
"""
# Modèle utilisé : llama-3.3-70b-versatile, temperature=0.5
```

---

## 4. Composant 2 : Agent Analytics (GroqService)

### Fichier : `analytics/groq_service.py` — Classe `GroqService`

L'agent analytics permet aux utilisateurs de **poser des questions en langage naturel** sur leurs données de test. Il génère automatiquement une requête SQL, l'exécute, et retourne les données.

### 4.1 Flux de Traitement

```
User: "Combien de tests ont échoué ce mois-ci ?"
                  │
                  ▼
    1. generate_sql(question, user)
       → Envoie le schéma DB + contraintes de sécurité au LLM
       → LLM génère le SQL approprié
                  │
                  ▼
    2. execute_query(sql_query)
       → Django connection.cursor() exécute la requête
       → Retourne les résultats sous forme de liste de dicts
                  │
                  ▼
    3. Détection automatique du type de visualisation :
       • 1 ligne, 1 colonne  → "metric"  (grand chiffre)
       • Colonne "count"/"total"  → "bar"   (graphique barres)
       • Colonne "date"/"time"    → "line"  (courbe temporelle)
       • Sinon                    → "table" (tableau)
                  │
                  ▼
    4. Réponse JSON avec data + sql + type
```

### 4.2 Schéma Base de Données Exposé au LLM

Le LLM connaît uniquement les tables et colonnes suivantes :

```
1. users_user               → id, username, email, role, is_active
2. campaigns_campaign       → id, title, description, status, start_date, 
                              estimated_end_date, project_id
3. testCases_testcase       → id, test_case_ref, data_json, status, 
                              campaign_id, tester_id, execution_date
                              (status: 'PENDING', 'PASSED', 'FAILED')
4. Project_project          → id, name, description, start_date, end_date, status
5. anomalies_anomalie       → id, titre, description, criticite, cree_le,
                              test_case_id, cree_par_id
                              (criticite: 'FAIBLE', 'MOYENNE', 'CRITIQUE')
```

### 4.3 Types de Visualisation Retournés

| Type | Condition de déclenchement | Utilisation Frontend |
|------|---------------------------|---------------------|
| `metric` | 1 seule valeur numérique | Grand chiffre centré |
| `bar` | Colonne `count` ou `total` | Graphique en barres |
| `line` | Colonne `date` ou `time` | Courbe temporelle |
| `table` | Cas par défaut | Tableau de données |
| `error` | Exception lors du traitement | Message d'erreur |

### 4.4 Persistance des Conversations

Chaque session de chat est sauvegardée en base de données :

- **`Conversation`** : Regroupe les messages d'une session (lié à un utilisateur)
- **`Message`** : Chaque échange user/agent avec texte, SQL généré, et données

```python
Message.objects.create(
    conversation=conversation,
    sender='agent',          # 'user' ou 'agent'
    text=result['answer'],
    type=result.get('type', 'text'),   # bar, line, table, metric, error
    sql=result.get('sql', ''),
    data=result.get('data', []),       # JSON avec les résultats
)
```

---

## 5. Composant 3 : Reformulation de Messages

### Méthode : `GroqService.reformulate_message(text, is_subject=False)`

Reformule un texte informel en message professionnel pour les emails, en deux modes :

### 5.1 Mode Corps d'Email (`is_subject=False`)

```
Entrée : "ca marche pas le bouton est cassé"
   │
   ▼
System Prompt → "Rewrite as professional email BODY. French. Professional, 
                 courteous, clear, concise."
   │
   ▼ Groq llama-3.3-70b-versatile, temperature=0.3
   │
Sortie : "Le bouton ne répond pas aux interactions utilisateur. 
          Une vérification du gestionnaire d'événements est requise."
```

### 5.2 Mode Sujet d'Email (`is_subject=True`)

```
Entrée : "bug critique login production"
   │
   ▼
System Prompt → "Rewrite as professional email SUBJECT. Short, impactful, 
                 max 10 words."
   │
   ▼ Groq llama-3.3-70b-versatile, temperature=0.3
   │
Sortie : "Dysfonctionnement critique du module de connexion en production"
```

**Paramètres Groq :** `temperature=0.3` (légèrement créatif mais resté focus et précis)

---

## 6. Modèles de Données

### `Conversation`

```python
class Conversation(models.Model):
    id         = UUIDField(primary_key=True)   # UUID unique
    user       = ForeignKey(User)              # Utilisateur propriétaire
    title      = CharField(max_length=255)     # Titre auto-généré (50 premiers chars)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### `Message`

```python
class Message(models.Model):
    conversation = ForeignKey(Conversation)
    sender       = CharField(choices=['user', 'agent'])
    text         = TextField()                 # Texte de réponse
    type         = CharField()                 # text | bar | line | table | metric | error
    sql          = TextField(null=True)        # SQL généré (pour audit)
    data         = JSONField()                 # Résultats de la requête SQL
    created_at   = DateTimeField(auto_now_add=True)
```

---

## 7. Endpoints API

| Méthode | URL | Vue | Description |
|---------|-----|-----|-------------|
| `GET` | `/analytics/timeline-guard/<campaign_id>/` | `CampaignTimelineGuardView` | Prédiction ML de la timeline |
| `POST` | `/analytics/ask/` | `AskAgentView` | Question en langage naturel |
| `POST` | `/analytics/reformulate/` | `ReformulateMessageView` | Reformulation d'email |
| `GET/POST` | `/analytics/conversations/` | `ConversationViewSet` | CRUD des conversations |
| `GET` | `/analytics/conversations/<id>/messages/` | `ConversationViewSet.messages` | Messages d'une conversation |

### Exemple de Requête — Timeline Guard

```bash
GET /analytics/timeline-guard/42/
Authorization: Bearer <JWT_TOKEN>
```

### Exemple de Requête — Ask Agent

```bash
POST /analytics/ask/
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "query": "Combien d'anomalies critiques ont été signalées ce mois-ci ?",
  "conversation_id": "optional-uuid"
}
```

### Exemple de Requête — Reformuler

```bash
POST /analytics/reformulate/
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "message": "le truc marche pas",
  "is_subject": false
}
```

---

## 8. Entraînement du Modèle ML

### Fichier : `research/train_model.py`

Le modèle ML est un **`RandomForestRegressor`** de scikit-learn, entraîné sur des données synthétiques.

### 8.1 Génération des Données d'Entraînement

```python
# 1000 échantillons synthétiques
total_cases    = randint(50, 500)     # Taille réaliste d'une campagne
finished_cases = randint(5, 45)       # Progrès en debut de projet
days_elapsed   = randint(1, 15)       # Durée écoulée
velocity       = finished_cases / days_elapsed

# Target avec bruit gaussien pour simuler l'imprévisibilité humaine
noise = normal(0, 1.5)
days_remaining = (total_cases - finished_cases) / (velocity + 0.1) + noise
```

### 8.2 Configuration du Modèle

```python
RandomForestRegressor(
    n_estimators=100,   # 100 arbres de décision
    random_state=42     # Reproductibilité
)
```

### 8.3 Résultats d'Entraînement

- **Split** : 80% train / 20% test
- **Métrique** : Score R² (coefficient de détermination)
- **Modèle sauvegardé** : `research/timeline_model.joblib` (~7.3 MB)

### 8.4 Comment Ré-entraîner le Modèle

```bash
cd /Users/user/Desktop/projet\ fe/InsureTM
python research/train_model.py
```

### 8.5 Sécurité du Modèle (Fallback)

Si le fichier `.joblib` est absent ou corrompu, le service n'échoue pas. Il bascule automatiquement sur un **calcul linéaire simple** :

```python
days_needed = math.ceil(remaining_cases / velocity)
```

De plus, même quand le modèle est utilisé, un garde-fou est appliqué :
```python
# Évite les prédictions trop pessimistes sur petits datasets
days_needed = min(ml_prediction, linear_prediction)
```

---

## 9. Sécurité et Contrôle d'Accès

### 9.1 Authentification

Tous les endpoints requièrent `IsAuthenticated` (JWT Token DRF).

### 9.2 Contrôle d'Accès par Rôle (RBAC)

Le **schéma SQL** exposé au LLM est dynamiquement adapté au rôle de l'utilisateur :

| Rôle | Accès `users_user` | Accès Campagnes | Accès TestCases |
|------|--------------------|-----------------|-----------------|
| `ADMIN` | ✅ Complet | ✅ Tous | ✅ Tous |
| `MANAGER` | ❌ Interdit | ✅ Tous | ✅ Tous |
| `TESTER` | ❌ Interdit | ✅ Assignées uniquement | ✅ Les siens uniquement |

Pour les **TESTERS**, des clauses `WHERE` sont injectées dans le prompt pour filtrer les données :
```sql
-- Exemple de restriction injectée pour un TESTER
WHERE tester_id = {user.id}
-- ou via la table de jointure
JOIN campaigns_campaign_assigned_testers WHERE user_id = {user.id}
```

### 9.3 Timeline Guard — Restriction Tester

```python
if request.user.role == 'TESTER':
    if not campaign.assigned_testers.filter(id=request.user.id).exists():
        return Response({'error': 'Accès non autorisé'}, status=403)
```

---

## 10. Flux de Données (Diagrammes)

### Flux ML Timeline Guard

```
Frontend                Backend                 ML / GroqAPI
   │                       │                        │
   │  GET timeline-guard/42 │                        │
   │──────────────────────►│                        │
   │                       │  Campaign.objects.get(42)
   │                       │──────────────────────►│ (DB)
   │                       │  TestCase stats calc  │
   │                       │  [velocity, elapsed]  │
   │                       │  model.predict(...)   │
   │                       │──────────────────────►│ (RandomForest)
   │                       │  days_remaining = 12  │
   │                       │◄──────────────────────│
   │                       │  prompt → Groq API    │
   │                       │──────────────────────►│ (Llama 3.3)
   │                       │  "Accélérez la cadence"│
   │                       │◄──────────────────────│
   │  JSON: {status, velocity, │                   │
   │  projected_end_date,  │                        │
   │  message, progress}   │                        │
   │◄───────────────────────│                        │
```

### Flux Agent Analytics

```
Frontend                Backend                 Groq + PostgreSQL
   │                       │                        │
   │  POST /ask/            │                        │
   │  {"query": "..."}     │                        │
   │──────────────────────►│                        │
   │                       │  generate_sql(q, user)│
   │                       │──────────────────────►│ (Groq: SQL gen)
   │                       │  "SELECT count..."    │
   │                       │◄──────────────────────│
   │                       │  execute_query(sql)   │
   │                       │──────────────────────►│ (PostgreSQL)
   │                       │  [{count: 42}]        │
   │                       │◄──────────────────────│
   │                       │  detect chart_type    │
   │  JSON: {answer, data, │                        │
   │  sql, type: "bar"}    │                        │
   │◄───────────────────────│                        │
```

---

## Résumé Technique

| Aspect | Détail |
|--------|--------|
| **Algorithme ML** | `RandomForestRegressor` (100 estimateurs) |
| **Features** | `total_cases`, `finished_cases`, `days_elapsed`, `velocity` |
| **Target** | `days_remaining` (jours restants prédits) |
| **LLM** | `llama-3.3-70b-versatile` via Groq API |
| **Langage de sortie IA** | Français |
| **Fallback ML** | Calcul linéaire automatique si modèle absent |
| **Modèle sauvegardé** | `research/timeline_model.joblib` |
| **Auth requise** | JWT (`IsAuthenticated`) sur tous les endpoints |
| **RBAC** | Schéma SQL dynamique + filtres WHERE par rôle |

---

## 11. 🐳 Configuration Docker

Cette section documente les réglages nécessaires pour que les fonctionnalités ML et IA fonctionnent correctement dans l'environnement Docker (via Nginx + Gunicorn).

### 11.1 Problèmes rencontrés & Corrections appliquées

#### ❌ Problème 1 — Modèle ML absent de l'image Docker

**Cause :** Le fichier `.dockerignore` excluait le dossier `research/` et les fichiers `*.joblib`, empêchant le modèle entraîné d'être copié dans l'image.

**Fichier :** `.dockerignore`

```diff
- research/
- *.joblib
+ # Exclure seulement les fichiers inutiles en prod
+ research/*.ipynb
+ research/train_model.py
+ *.pkl
```

> Le modèle `research/timeline_model.joblib` (~7.3 MB) est maintenant inclus dans l'image backend.

---

#### ❌ Problème 2 — Incompatibilité `groq` / `httpx`

**Cause :** `groq==0.11.0` utilisait l'argument `proxies` dans son client HTTP, supprimé dans `httpx>=0.28`. Cela causait une `TypeError` au démarrage de chaque appel Groq.

```
TypeError: Client.__init__() got an unexpected keyword argument 'proxies'
```

**Fichier :** `InsureTM/requirements.txt`

```diff
- groq==0.11.0
+ groq>=0.13.0
+ httpx>=0.27.0,<0.29.0
```

> La version `groq>=0.13.0` est compatible avec `httpx 0.28+`.

---

#### ❌ Problème 3 — URLs hardcodées dans le Frontend

**Cause :** Le composant React faisait des appels `fetch` avec l'URL absolue `http://localhost:8000`, qui est inaccessible depuis le navigateur en Docker (le port 8000 n'est pas exposé publiquement — seul le port 80/Nginx l'est).

**Fichier :** `project/src/services/api.ts`

```diff
- baseURL: 'http://127.0.0.1:8000/api'
+ baseURL: '/api'

- tokenRefreshURL: 'http://127.0.0.1:8000/api/token/refresh/'
+ tokenRefreshURL: '/api/token/refresh/'
```

**Fichier :** `project/src/components/AnalyticsChatWidget.tsx`

```diff
- fetch('http://localhost:8000/api/analytics/ask/', ...)
+ fetch('/api/analytics/ask/', ...)

- fetch(`http://localhost:8000/api/analytics/conversations/${id}/messages/`, ...)
+ fetch(`/api/analytics/conversations/${id}/messages/`, ...)
```

> Les URLs relatives passent par **Nginx** qui proxy vers `backend:8000` en interne.

---

### 11.2 Architecture Réseau Docker

```
Navigateur
    │
    │ :80 (HTTP)
    ▼
┌──────────────────────────────────────┐
│             Nginx (reverse proxy)    │
│  /api/*       → backend:8000         │
│  /            → frontend:80          │
└──────────┬───────────────────────────┘
           │                   │
    ┌──────▼──────┐    ┌───────▼──────┐
    │   Backend   │    │   Frontend   │
    │  (Gunicorn) │    │ (Nginx/Vite) │
    │  port 8000  │    │  port 80     │
    │  Django     │    │  React SPA   │
    └──────┬──────┘    └──────────────┘
           │ PORT INTERNE UNIQUEMENT
    ┌──────▼──────┐
    │ PostgreSQL  │
    │  port 5432  │
    └─────────────┘
```

> ⚠️ Le port `8000` du backend n'est **pas exposé** directement. Toutes les requêtes doivent passer par Nginx via des URLs relatives (`/api/...`).

---

### 11.3 Variables d'Environnement Requises

**Fichier :** `InsureTM/.env.docker`

```env
# Clé API Groq (obligatoire pour l'Agent Analytics et la Reformulation)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Base de données
DATABASE_URL=postgresql://user:password@db:5432/insuretm
```

> 🔑 La `GROQ_API_KEY` s'obtient gratuitement sur [console.groq.com](https://console.groq.com).

---

### 11.4 Commandes Docker Utiles

#### Rebuild complet après modification

```bash
# Backend (requirements.txt, code Python, .dockerignore)
docker compose up -d --build backend

# Frontend (composants React, api.ts)
docker compose up -d --build frontend

# Rebuild complet
docker compose up -d --build
```

#### Vérifier que Groq fonctionne dans le container

```bash
docker exec insuretm-backend python -c "
from analytics.groq_service import GroqService
svc = GroqService()
print('✅ Groq OK :', type(svc.client).__name__)
"
```

#### Tester l'endpoint analytics via curl

```bash
# 1. Obtenir un token JWT
TOKEN=$(curl -s -X POST http://localhost/api/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")

# 2. Tester l'agent analytics
curl -X POST http://localhost/api/analytics/ask/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Combien de campagnes existent ?"}'
```

**Réponse attendue :**
```json
{
  "answer": "Here is the data I found:",
  "data": [{"count": 1}],
  "sql": "SELECT COUNT(id) FROM campaigns_campaign",
  "type": "metric"
}
```

---

### 11.5 Résumé des Fichiers Modifiés

| Fichier | Modification | Raison |
|---------|-------------|--------|
| `InsureTM/.dockerignore` | Suppression des exclusions `research/` et `*.joblib` | Inclure le modèle ML dans l'image |
| `InsureTM/requirements.txt` | `groq==0.11.0` → `groq>=0.13.0` + `httpx` pinné | Compatibilité httpx 0.28+ |
| `project/src/services/api.ts` | URLs absolues → URLs relatives `/api` | Compatibilité Nginx Docker |
| `project/src/components/AnalyticsChatWidget.tsx` | 2 URLs `http://localhost:8000` → `/api` | Compatibilité Nginx Docker |

"Nous avons choisi le RandomForestRegressor car il offre un excellent compromis entre précision et vitesse d'exécution, ce qui permet des prédictions instantanées dès que l'utilisateur consulte son tableau de bord."