# 🛡️ Documentation Complète — Plateforme InsureTM

Cette documentation offre une vue d'ensemble technique et fonctionnelle de la plateforme **InsureTM**, une solution de gestion de tests "end-to-end" conçue pour digitaliser et automatiser le cycle de vie des tests chez **Lloyd Assurances**.

---

## 📖 Sommaire
1. [Introduction & Vision](#1-introduction--vision)
2. [Écosystème IA (Intelligence Mode)](#2-écosystème-ia-intelligence-mode)
3. [Interfaces Modernisées (High-Fidelity)](#3-interfaces-modernisées-high-fidelity)
4. [Workflow Opérationnel](#4-workflow-opérationnel)
5. [Gestion des Anomalies](#5-gestion-des-anomalies)
6. [Architecture & Stack Technique](#6-architecture--stack-technique)
7. [Guide de Déploiement](#7-guide-de-déploiement)

---

## 1. Introduction & Vision
**InsureTM** n'est pas qu'un simple gestionnaire de tests ; c'est un tableau de bord décisionnel intelligent. Son objectif est de transformer les workflows manuels et fragmentés en un écosystème centralisé, collaboratif et prédictif, garantissant que Lloyd Assurances déploie des logiciels sans défauts tout en optimisant le temps de travail des équipes.

---

## 2. Écosystème IA (Intelligence Mode)
L'IA est le cœur battant de la plateforme, transformant les données brutes en insights exploitables.

### 🧠 ML Timeline Guard (Moteur Prédictif)
Un moteur de Machine Learning qui analyse en continu la vélocité de l'équipe :
- **Analyse de Vélocité** : Calcule le nombre de tests exécutés par jour.
- **Projection Temporelle** : Si l'équipe ralentit, l'IA projette une **nouvelle date de fin réelle**.
- **Gestion des Risques** : Alerte les managers via des badges de risque (Optimal, Warning, Critical) et affiche le retard estimé en jours.

### 📈 Release Readiness Score (Indice de Confiance)
Un score global (0-100%) qui évalue la stabilité d'une version :
- **Analyse Multidimensionnelle** : Combine le taux de réussite, la couverture des tests et la sévérité des bugs ouverts.
- **Aide à la Décision** : Indique clairement si la release est **prête** pour la mise en production.

### ✍️ AI Brief & Reformulation
- **AIBriefCard** : Résumés automatiques des points critiques pour les managers.
- **Smart Collaboration** : Assistance IA pour reformuler et clarifier les messages dans le chat de suivi.

---

## 3. Interfaces Modernisées (High-Fidelity)
Inspirée des standards de design les plus récents (**Glassmorphism**), l'interface offre une expérience fluide et premium.

### 📱 Tester Dashboard 2.0 (HUD)
- **Dashboard HUD (Heads-Up Display)** : Indicateurs vitaux (Campagnes assignées, Tests à faire, Readiness moyenne).
- **Interactive Gauges** : Jauges circulaires animées fournissant un retour visuel immédiat sur la progression.
- **AI Forecast Visibility** : Affichage direct des projections de l'IA sur chaque carte de campagne.

### 💬 Review Panel (Chat de Suivi)
- **Architecture Moderne** : Effet de flou (backdrop-blur) et tiroir latéral (Drawer) pour ne pas casser le flux de travail.
- **Hiérarchie de l'Information** : Historique groupé par date et marquage automatique des événements système (Changement de statut, assignation).

---

## 4. Workflow Opérationnel
Le processus est structuré pour une efficacité maximale :
1. **Pilotage (Manager)** : Création des Projets/Releases, import de cas de tests Excel et assignation stratégique.
2. **Exécution (Testeur)** : Réception des tâches sur le HUD, exécution avec preuve photo, et collaboration directe via le chat.
3. **Validation (Système/IA)** : Agrégation des résultats, calcul des scores de préparation et alertes de dérive de calendrier.

---

## 5. Gestion des Anomalies
- **Traçabilité Totale** : Chaque bug est lié à un cas de test et une exécution spécifique.
- **Rôles de Gouvernance** : Création restreinte (Testeurs/Admins) pour éviter le bruit, et vue de pilotage pour les Managers.

---

## 6. Architecture & Stack Technique

### Frontend (React 18 & Vite)
- **TypeScript** : Pour un code robuste et maintenable.
- **Portals** : Isolation des overlays pour un z-index parfait.

### Backend (Django 5 & DRF)
- **Authentification** : Sécurisée via JWT.
- **IA Hybride** : Intégration de Groq (LPU) pour la rapidité et modèles personnalisés pour le ML.

---

## 7. Guide de Déploiement

### Environnement Docker
La plateforme est entièrement conteneurisée (5 services : Backend, Frontend, DB, Nginx, Redis).
```bash
docker compose up --build -d
```

### Configuration IA
Ajoutez votre clé dans le `.env` pour activer l'Intelligence Mode :
```env
GROQ_API_KEY=gsk_your_key_here
```

---

*Contact Support : support@insuretm.lloyd.tn*
