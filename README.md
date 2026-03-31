<div align="center">

# 🛡️ InsureTM — Test Management Platform

**Plateforme de gestion de tests pour Lloyd Assurances**

[![CI — InsureTM](https://github.com/onsben19/Test-Management-Plateforme-LLoyd/actions/workflows/ci.yml/badge.svg)](https://github.com/onsben19/Test-Management-Plateforme-LLoyd/actions/workflows/ci.yml)
![Django](https://img.shields.io/badge/Django-5.0-green)
![React](https://img.shields.io/badge/React-18-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)

</div>

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Architecture](#-architecture)
- [Stack technique](#-stack-technique)
- [Démarrage rapide (Docker)](#-démarrage-rapide-docker)
- [Développement local](#-développement-local)
- [Structure du projet](#-structure-du-projet)
- [CI/CD](#-cicd)
- [Variables d'environnement](#-variables-denvironnement)

---

## 🎯 À propos

InsureTM est une plateforme de gestion de tests conçue pour Lloyd Assurances dans le cadre d'un PFE (Projet de Fin d'Études). Elle permet de :

- 📁 **Gérer des projets/releases** et organiser les campagnes de tests
- 📊 **Importer des cas de tests** depuis des fichiers Excel
- ✅ **Suivre l'exécution** des tests avec preuve photo
- 🐛 **Signaler des anomalies** avec niveaux de criticité
- 💬 **Collaborer** via commentaires sur les cas de tests
- 📧 **Envoyer des notifications** par email et in-app
- 🤖 **Interagir** avec l'analyse de données via l'Agent IA

---

## 🏗️ Architecture

```
Internet (port 80)
       │
       ▼
┌─────────────────┐
│   Nginx Proxy   │  ← Point d'entrée unique
└────────┬────────┘
         │
    ┌────┼────────────┐
    ▼         ▼            ▼
┌────────┐ ┌──────────┐ ┌─────────┐
│Frontend│ │ Backend  │
│ React  │ │ Django + │ │  :3000  │
│ Nginx  │ │ Gunicorn │ └─────────┘
└────────┘ └────┬─────┘
                │
                ▼
         ┌────────────┐
         │ PostgreSQL │
         │  15-alpine │
         └────────────┘
```

---

## 💻 Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide |
| **Backend** | Django 5, Django REST Framework, SimpleJWT |
| **Base de données** | PostgreSQL 15 |
| **Serveur prod** | Gunicorn (3 workers) + Nginx |
| **IA Agent** | Google Gemini |
| **Emails** | SendGrid / SMTP |
| **Conteneurisation** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |

---

## 🚀 Démarrage rapide (Docker)

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### 1. Cloner le projet

```bash
git clone https://github.com/onsben19/Test-Management-Plateforme-LLoyd.git
cd Test-Management-Plateforme-LLoyd
```

### 2. Configurer les variables d'environnement

```bash
# Créer le fichier de configuration Docker (ne sera pas commité)
cp .env.example InsureTM/.env.docker
# Éditer InsureTM/.env.docker avec vos valeurs
```

### 3. Lancer la stack

```bash
docker compose up --build
```

### 4. Accéder aux services

| Service | URL |
|---------|-----|
| 🖥️ Frontend | http://localhost |
| 🔌 API REST | http://localhost/api/ |
| 📄 Admin Django | http://localhost:8000/admin |

### Commandes utiles

```bash
docker compose up -d          # Démarrer en arrière-plan
docker compose down           # Arrêter
docker compose logs backend   # Voir les logs du backend
docker compose build backend  # Rebuilder un service spécifique
```

---

## 🔧 Développement local

### Backend (Django)

```bash
cd InsureTM
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configurer la base de données
cp .env.example .env  # Éditer avec vos valeurs PostgreSQL locales

python manage.py migrate
python manage.py runserver
# → http://localhost:8000
```

### Frontend (React)

```bash
cd project
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Structure du projet

```
Test-Management-Plateforme-LLoyd/
│
├── InsureTM/                    # Backend Django
│   ├── config/                  # Settings, URLs, WSGI
│   ├── users/                   # Gestion utilisateurs + JWT
│   ├── Project/                 # Projets / Releases
│   ├── campaigns/               # Campagnes de test
│   ├── testCases/               # Cas de tests
│   ├── anomalies/               # Anomalies
│   ├── comments/                # Commentaires
│   ├── emails/                  # Emails SMTP
│   ├── notifications/           # Notifications in-app
│   ├── analytics/               # Agent IA d'analyse
│   ├── Dockerfile               # Image Docker backend
│   ├── requirements.txt         # Dépendances Python
│   └── .env.example             # Template variables d'env
│
├── project/                     # Frontend React
│   ├── src/
│   │   ├── pages/               # Pages principales
│   │   ├── components/          # Composants réutilisables
│   │   ├── services/api.ts      # Client Axios centralisé
│   │   └── context/             # AuthContext (JWT)
│   ├── Dockerfile               # Image Docker frontend
│   └── nginx.conf               # Config Nginx SPA
│
├── nginx/
│   └── nginx.conf               # Reverse proxy
│
├── docker-compose.yml           # Orchestration 5 services
├── .env.example                 # Template de configuration
└── .github/
    └── workflows/
        └── ci.yml               # Pipeline CI/CD
```

---

## ⚙️ CI/CD

Le pipeline GitHub Actions se déclenche automatiquement à chaque `push` sur `main` :

```
push → main
    │
    ├── Job 1: backend-test
    │   ├── Spin up PostgreSQL
    │   ├── pip install -r requirements.txt
    │   ├── python manage.py check
    │   ├── python manage.py migrate
    │   └── python manage.py test
    │
    └── Job 2: docker-build (après succès du Job 1)
        ├── docker build insuretm-backend
        └── docker build insuretm-frontend
```

---

## 🔐 Variables d'environnement

Copier `.env.example` vers `InsureTM/.env.docker` et renseigner :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SECRET_KEY` | Clé secrète Django | `your-secret-key` |
| `DEBUG` | Mode debug | `False` |
| `DATABASE_URL` | URL PostgreSQL | `postgres://user:pass@db:5432/dbname` |
| `ALLOWED_HOSTS` | Hôtes autorisés | `localhost,127.0.0.1` |
| `EMAIL_USER` | Email SMTP | `you@gmail.com` |
| `EMAIL_PASSWORD` | App password Gmail | `xxxx xxxx xxxx xxxx` |
| `GROQ_API_KEY` | Clé API Groq (IA) | `gsk_...` |
| `VANNA_API_KEY` | Clé API Vanna.ai | `vn-...` |

---

<div align="center">

**Projet de Fin d'Études — Lloyd Assurances**  
Développé avec ❤️ par Ons Ben Massoud

</div>
