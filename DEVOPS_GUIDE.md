# 📚 Guide DevOps Complet — InsureTM
### Docker · CI/CD · GitHub Actions · PostgreSQL

> **Pour qui ?** Ce guide est conçu pour comprendre chaque décision technique prise dans la partie DevOps du projet InsureTM, pouvoir expliquer ce travail à un jury, et manipuler la stack au quotidien.

---

## 🗂️ Table des matières

1. [C'est quoi le DevOps ?](#1-cest-quoi-le-devops-)
2. [Pourquoi Docker ?](#2-pourquoi-docker-)
3. [C'est quoi une image Docker ?](#3-cest-quoi-une-image-docker-)
4. [C'est quoi un conteneur ?](#4-cest-quoi-un-conteneur-)
5. [Le Dockerfile Backend — Django](#5-le-dockerfile-backend--django)
6. [Le Dockerfile Frontend — React](#6-le-dockerfile-frontend--react)
7. [Nginx — le chef d'orchestre du trafic](#7-nginx--le-chef-dorchestre-du-trafic)
8. [docker-compose.yml — tout ensemble](#8-docker-composeyml--tout-ensemble)
9. [les .dockerignore — pourquoi c'est critique](#9-les-dockerignore--pourquoi-cest-critique)
10. [Les variables d'environnement](#10-les-variables-denvironnement)
11. [GitHub Actions — CI/CD](#11-github-actions--cicd)
12. [Commandes du quotidien](#12-commandes-du-quotidien)
13. [Étapes suivantes (Déploiement VPS)](#13-étapes-suivantes-déploiement-vps)
14. [Glossaire](#14-glossaire)

---

## 1. C'est quoi le DevOps ?

**DevOps** = **Dev**elopment + **Op**eration**s**

C'est un ensemble de pratiques qui rapprochent les développeurs (qui écrivent le code) et les équipes qui déploient et maintiennent l'application en production.

**Objectif :** Livrer du code **plus vite**, avec **moins d'erreurs**, de façon **reproductible** sur n'importe quelle machine.

```
Sans DevOps :                    Avec DevOps (notre projet) :
─────────────                    ──────────────────────────
"Ça marche sur mon PC..."        git push → tests auto → docker build
Tu mets 2h à installer le projet docker compose up → tout tourne en 1 commande
Les configs sont dans ta tête    Tout est dans des fichiers (.env, Dockerfile...)
```

**Ce qu'on a mis en place pour InsureTM :**
- 🐳 **Docker** : empaqueter l'app pour qu'elle tourne partout
- 🔀 **Docker Compose** : orchestrer 5 services ensemble
- ⚙️ **GitHub Actions** : automatiser les tests à chaque push

---

## 2. Pourquoi Docker ?

### Le problème sans Docker
Imagine ton jury qui veut tester InsureTM :
1. Installe Python 3.11 ❌ (il a Python 3.9)
2. Installe PostgreSQL ❌ (mauvaise version)
3. Active le venv, pip install... ❌ (conflit avec un autre projet)
4. Configure les variables d'env... ❌ (oublie EMAIL_PASSWORD)

→ **2 heures perdues, jamais arrivé à lancer.**

### La solution avec Docker
```bash
docker compose up --build
```
→ **Tout tourne en 5 minutes**, quelle que soit la machine.

### Comment ça marche
Docker crée des **conteneurs** isolés — comme des mini-ordinateurs virtuels très légers, chacun avec son propre système, ses propres dépendances. Ton app tourne dans le conteneur exactement comme tu l'as configurée, indépendamment de la machine hôte.

---

## 3. C'est quoi une image Docker ?

Une **image** Docker = la "recette" figée de ton application.

Analogie : si le conteneur est un gâteau, l'image est la recette + tous les ingrédients prêts à l'emploi.

| Concept | Analogie cuisine |
|---|---|
| **Dockerfile** | La recette écrite |
| **Image Docker** | Les ingrédients préparés et mesurés |
| **Conteneur** | Le gâteau fini qu'on mange |

Une image est **immuable** — elle ne change pas. Si tu modifies ton code, tu rebuildes une nouvelle image.

```bash
# Construire une image
docker build -t insuretm-backend ./InsureTM

# Lister les images sur ta machine
docker images
```

---

## 4. C'est quoi un conteneur ?

Un **conteneur** = une instance en cours d'exécution d'une image.

Tu peux lancer plusieurs conteneurs depuis la même image. Chaque conteneur est isolé : il a son propre système de fichiers, ses propres processus, son propre réseau.

```bash
# Voir les conteneurs qui tournent
docker ps

# Voir les logs d'un conteneur
docker logs insuretm-backend

# Entrer dans un conteneur (comme SSH)
docker exec -it insuretm-backend bash

# Arrêter un conteneur
docker stop insuretm-backend
```

---

## 5. Le Dockerfile Backend — Django

**Fichier :** `InsureTM/Dockerfile`

```dockerfile
# ════════════════════════════════════════
# ÉTAPE 1 — BUILD (compilation)
# ════════════════════════════════════════
FROM python:3.11-slim AS builder
```
> On part d'une image Python officielle, version "slim" = version légère sans outils inutiles.

```dockerfile
WORKDIR /app
```
> On définit `/app` comme répertoire de travail dans le conteneur (équivalent de `cd /app`).

```dockerfile
RUN apt-get update && apt-get install -y libpq-dev gcc
```
> On installe `libpq-dev` et `gcc` — nécessaires pour **compiler** `psycopg2` (le driver PostgreSQL pour Python).

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```
> On copie le fichier requirements et on installe toutes les dépendances Python.

```dockerfile
# ════════════════════════════════════════
# ÉTAPE 2 — RUNTIME (image finale légère)
# ════════════════════════════════════════
FROM python:3.11-slim
```
> On repart d'une image Python vierge — **sans** gcc ni libpq-dev (inutiles en prod).

```dockerfile
COPY --from=builder /usr/local/lib/python3.11/site-packages ...
COPY --from=builder /usr/local/bin ...
```
> On récupère **uniquement les packages installés** depuis l'étape 1, sans les outils de compilation. 
> **Résultat : image finale ~60% plus légère.**

```dockerfile
COPY . .
```
> On copie le code source Django dans le conteneur.

```dockerfile
CMD ["sh", "-c", "python manage.py migrate --noinput && \
                  python manage.py collectstatic --noinput && \
                  gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
```
> Au démarrage du conteneur, on exécute 3 choses dans l'ordre :
> 1. **`migrate`** : applique les migrations à la DB
> 2. **`collectstatic`** : rassemble les fichiers statiques dans `staticfiles/`
> 3. **`gunicorn`** : démarre le serveur de production avec 3 workers (3 processus parallèles)

### Pourquoi Gunicorn et pas `runserver` ?

| `manage.py runserver` | Gunicorn |
|---|---|
| Mono-thread (1 requête à la fois) | Multi-workers (3 requêtes simultanées) |
| Pas de gestion des crash | Redémarre les workers si crash |
| Pour le développement uniquement | Pour la production |
| Ne doit JAMAIS être utilisé en prod | Standard de l'industrie |

---

## 6. Le Dockerfile Frontend — React

**Fichier :** `project/Dockerfile`

```dockerfile
# ════════════════════════════════════════
# ÉTAPE 1 — BUILD React
# ════════════════════════════════════════
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile
```
> `npm ci` = installation propre depuis le `package-lock.json` (reproductible, pas de surprises).

```dockerfile
COPY . .
RUN npm run build
```
> `npm run build` compile tout le TypeScript + React → un dossier `dist/` avec fichiers HTML/JS/CSS optimisés.

```dockerfile
# ════════════════════════════════════════
# ÉTAPE 2 — Servir avec Nginx
# ════════════════════════════════════════
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```
> On sert juste les fichiers statiques compilés. **Node.js n'est plus nécessaire** en production.
> L'image finale ne contient que Nginx + les fichiers HTML/JS/CSS.

**Fichier :** `project/nginx.conf`
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
> **SPA Routing** : si l'utilisateur accède à `/projects/42`, Nginx renvoie `index.html` au lieu d'une erreur 404, et c'est React Router qui gère la navigation côté client.

---

## 7. Nginx — le chef d'orchestre du trafic

**Fichier :** `nginx/nginx.conf`

Nginx est un serveur web ultra-performant utilisé comme **reverse proxy** — il reçoit toutes les requêtes sur le port 80 et les redirige vers le bon service.

```
Utilisateur: http://localhost/admin/      → Django Admin
```

**Pourquoi c'est important ?**
- Sans Nginx, ton frontend ferait des requêtes vers `http://localhost:8000/api/` → problèmes CORS  
- Avec Nginx, tout est sur le même domaine/port → pas de CORS, plus simple, plus sécurisé

```nginx
# nginx/nginx.conf (simplifié)
server {
    listen 80;

    location / {
        proxy_pass http://frontend:80;    # → conteneur frontend
    }

    location /api/ {
        proxy_pass http://backend:8000;   # → conteneur Django
    }
}
```

> Les noms `frontend` et `backend` sont les **noms des services** dans `docker-compose.yml`. Docker crée un réseau interne automatiquement, et les services se parlent par leurs noms.

---

## 8. docker-compose.yml — tout ensemble

**Fichier :** `docker-compose.yml`

C'est le fichier qui définit et orchestre **tous les services ensemble**.

### Structure complète annotée

```yaml
services:

  # ──────────────────────────────────────
  db:                            # Service PostgreSQL
    image: postgres:15-alpine    # Image officielle PostgreSQL
    environment:
      POSTGRES_DB: insureTM_db   # Nom de la base
      POSTGRES_USER: postgres    # Utilisateur
      POSTGRES_PASSWORD: 282681  # Mot de passe
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Données persistantes
    healthcheck:                 # Vérifie que PostgreSQL est prêt
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s              # Vérifie toutes les 10 secondes
      retries: 5                 # 5 tentatives avant d'échouer

  # ──────────────────────────────────────
  backend:
    build:
      context: ./InsureTM        # Dossier contenant le Dockerfile
    env_file:
      - ./InsureTM/.env.docker   # Charge les variables d'env
    depends_on:
      db:
        condition: service_healthy  # Attend que db soit SAIN avant de démarrer
    expose:
      - "8000"                   # Port interne (pas exposé à l'extérieur)

  # ──────────────────────────────────────
  frontend:
    build:
      context: ./project
    expose:
      - "80"

  # ──────────────────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"                  # ← Seul port exposé vers l'extérieur !
    depends_on:
      - backend
      - frontend

volumes:
  static_data:      # Fichiers statiques Django
```

### Le réseau interne Docker

```
┌─────────────────────────────────────────┐
│  Réseau Docker "projetfe_default"       │
│                                         │
│  db:5432  ←──  backend:8000             │
│                     ↑                   │
│  frontend:80 ←── nginx:80 ──→ :80 ext. │
└─────────────────────────────────────────┘
```

Les services se parlent par leur **nom de service** (ex: `db`, `backend`). C'est pour ça que dans `.env.docker` on a `DATABASE_URL=postgres://postgres:282681@db:5432/...` avec **`db`** au lieu de `localhost`.

---

## 9. Les .dockerignore — pourquoi c'est critique

**Fichiers :** `InsureTM/.dockerignore` et `project/.dockerignore`

Quand Docker construit une image, il d'abord envoie tous les fichiers du dossier vers le daemon Docker — c'est le "contexte de build".

**Avant `.dockerignore` :**
```
Contexte de build = tout le dossier InsureTM/
→ venv/               550 MB  😱 (packages Python déjà installés localement)
→ __pycache__/         60 MB
→ .git/                20 MB
→ Code source            3 MB
TOTAL: ~630 MB → Docker crashe, disque plein
```

**Après `.dockerignore` :**
```
Contexte de build = uniquement ce qui est utile
→ Code source            3 MB
→ requirements.txt      < 1 KB
TOTAL: ~3 MB ✅ → Build en 3 secondes
```

```
# InsureTM/.dockerignore
venv/           ← JAMAIS copier le venv (on réinstalle dans le conteneur)
__pycache__/    ← Bytecode inutile
.env            ← JAMAIS copier les secrets
.env.docker     ← idem
db.sqlite3      ← Base de dev locale
media/          ← Fichiers uploadés (géré par volumes)
.git/           ← Historique Git (inutile dans l'image)
```

---

## 10. Les variables d'environnement

**La règle d'or : jamais de secrets dans le code ou dans Git.**

### 3 fichiers distincts

| Fichier | Commité ? | Usage |
|---|---|---|
| `.env.example` | ✅ OUI | Template public — montre quelles variables sont nécessaires |
| `InsureTM/.env` | ❌ NON | Dev local — pointe vers `localhost` |
| `InsureTM/.env.docker` | ❌ NON | Docker — pointe vers `db` (service Docker) |

### Différence clé `.env` vs `.env.docker`

```bash
# .env (développement local)
DATABASE_URL=postgres://postgres:282681@localhost:5432/insureTM_db
#                                        ^^^^^^^^^
#                                        localhost car PostgreSQL tourne sur ta machine

# .env.docker (dans Docker)
DATABASE_URL=postgres://postgres:282681@db:5432/insureTM_db
#                                        ^^
#                                        'db' = nom du service Docker
```

---

## 11. GitHub Actions — CI/CD

**Fichier :** `.github/workflows/ci.yml`

### C'est quoi le CI ?

**CI = Continuous Integration** (Intégration Continue)

À chaque fois que tu fais `git push`, GitHub lance automatiquement une série de vérifications pour s'assurer que ton code ne casse rien.

```
Tu fais git push
      ↓
GitHub détecte le push
      ↓
Lance .github/workflows/ci.yml
      ↓
Job 1: backend-test
  ├── Crée une base PostgreSQL temporaire
  ├── Installe les dépendances Python
  ├── python manage.py check    → vérifie la config Django
  ├── python manage.py migrate  → vérifie les migrations
  └── python manage.py test     → lance les tests unitaires
      ↓ (seulement si Job 1 réussit)
Job 2: docker-build
  ├── docker build ./InsureTM   → vérifie que l'image backend se build
  └── docker build ./project    → vérifie que l'image frontend se build
      ↓
Badge dans le README mis à jour (vert ✅ ou rouge ❌)
```

### Voir les résultats

Va sur : https://github.com/onsben19/Test-Management-Plateforme-LLoyd/actions

Tu verras chaque run avec le détail de chaque étape, les logs, et le statut.

### Le badge dans le README

```markdown
[![CI — InsureTM](https://github.com/onsben19/Test-Management-Plateforme-LLoyd/actions/workflows/ci.yml/badge.svg)](...)
```
Ce badge se met à jour automatiquement. Il est visible sur la page GitHub du projet.

---

## 12. Commandes du quotidien

### Lancer la stack complète

```bash
# Premier lancement (build + démarrage)
docker compose up --build

# Lancer en arrière-plan (tu récupères le terminal)
docker compose up -d --build

# Accéder à l'application
open http://localhost/api/   # API Django
``` 

### Gérer les conteneurs

```bash
# Voir l'état de tous les conteneurs
docker compose ps

# Voir les logs en temps réel
docker compose logs -f              # Tous les services
docker compose logs -f backend      # Seulement le backend
docker compose logs -f --tail=50 backend  # Les 50 dernières lignes

# Arrêter tous les conteneurs
docker compose down

# Arrêter ET supprimer les volumes (⚠️ supprime les données DB !)
docker compose down -v
```

### Rebuild d'un seul service

Si tu modifies le code du backend :
```bash
docker compose build backend   # Rebuild l'image
docker compose up -d backend   # Redémarre le conteneur
```

### Accéder à la base de données

```bash
# Ouvrir un shell PostgreSQL dans le conteneur
docker exec -it insuretm-db psql -U postgres -d insureTM_db

# Commandes PostgreSQL utiles :
\dt              # Lister les tables
\d users_user    # Décrire une table
SELECT * FROM users_user LIMIT 5;
\q               # Quitter
```

### Lancer des commandes Django dans le conteneur

```bash
# Créer un superuser
docker exec -it insuretm-backend python manage.py createsuperuser

# Lancer les migrations manuellement
docker exec -it insuretm-backend python manage.py migrate

# Ouvrir un shell Django
docker exec -it insuretm-backend python manage.py shell
```

### Nettoyer l'espace Docker

```bash
# Voir l'espace utilisé par Docker
docker system df

# Supprimer les images/conteneurs/volumes inutilisés
docker system prune -f

# Suppression agressive (⚠️ supprime TOUT ce qui n'est pas actif)
docker system prune -a -f
```

---

## 13. Étapes suivantes (Déploiement VPS)

Une fois satisfait du développement local, l'étape suivante est de déployer sur un vrai serveur.

### Option recommandée pour un PFE : DigitalOcean ou OVH

**Coût :** ~5€/mois pour un serveur basique.

**Étapes grandes lignes :**

```
1. Créer un VPS Ubuntu 22.04
2. Installer Docker sur le VPS
3. Copier le projet sur le VPS (git clone)
4. Configurer le .env.docker sur le VPS
5. docker compose up -d --build
6. Configurer un nom de domaine
7. Ajouter HTTPS avec Let's Encrypt (gratuit)
```

**Pour aller plus loin avec le CI/CD :**  
On peut ajouter un **Job 3** dans `ci.yml` qui déploie automatiquement sur le VPS à chaque push en utilisant SSH depuis GitHub Actions.

---

## 14. Glossaire

| Terme | Définition |
|---|---|
| **Docker** | Outil de conteneurisation — empaquette une app avec toutes ses dépendances |
| **Image Docker** | "Recette" figée d'une application (résultat du `docker build`) |
| **Conteneur** | Instance en cours d'exécution d'une image |
| **Dockerfile** | Fichier texte qui décrit comment construire une image |
| **Docker Compose** | Outil pour définir et lancer plusieurs conteneurs ensemble |
| **Nginx** | Serveur web high-performance / reverse proxy |
| **Reverse Proxy** | Serveur qui reçoit les requêtes et les redirige vers d'autres serveurs |
| **Gunicorn** | Serveur WSGI Python pour la production (remplace `runserver`) |
| **WSGI** | Interface standard Python pour les serveurs web |
| **Volume Docker** | Stockage persistant qui survit aux redémarrages de conteneurs |
| **Healthcheck** | Vérification automatique qu'un service est bien démarré et fonctionnel |
| **CI/CD** | Continuous Integration / Continuous Deployment — automatisation |
| **GitHub Actions** | Système CI/CD intégré à GitHub |
| **Pipeline** | Série d'étapes automatisées (build → test → deploy) |
| **env_file** | Fichier de variables d'environnement chargé par Docker Compose |
| **Build context** | Ensemble de fichiers envoyés à Docker lors du build |
| **.dockerignore** | Fichier listant ce qui doit être exclu du contexte de build |
| **Multi-stage build** | Technique Dockerfile utilisant plusieurs étapes pour réduire la taille finale |
| **SPA Routing** | Navigation côté client dans une Single Page App (React Router) |
| **VPS** | Virtual Private Server — serveur cloud loué |
