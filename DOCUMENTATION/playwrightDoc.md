# 🎭 Documentation des Tests End-to-End — InsureTM
### Automatisation QA avec Playwright

---

## Table des Matières

1. [Introduction](#1-introduction)
2. [Prérequis et Installation](#2-prérequis-et-installation)
3. [Architecture des Tests](#3-architecture-des-tests)
4. [Configuration Playwright](#4-configuration-playwright)
5. [Système d'Authentification](#5-système-dauthentification)
6. [Catalogue des Tests](#6-catalogue-des-tests)
   - [Login](#61-tests-de-connexion--loginspects)
   - [Manager - Dashboard](#62-manager--dashboard)
   - [Manager - Campagnes](#63-manager--campagnes)
   - [Manager - Releases](#64-manager--releases)
   - [Manager - Anomalies](#65-manager--anomalies)
   - [Manager - IA & ML](#66-manager--intelligence-ia--ml)
   - [Testeur - Espace & Exécution](#67-testeur--espace--exécution)
7. [Commandes de Lancement](#7-commandes-de-lancement)
8. [Résultats et Rapports](#8-résultats-et-rapports)
9. [Concepts Clés Expliqués](#9-concepts-clés-expliqués)

---

## 1. Introduction

Ce dossier contient la suite de tests **End-to-End (E2E)** de la plateforme **InsureTM**, développés avec [Playwright](https://playwright.dev/).

### Qu'est-ce qu'un test End-to-End ?

Un test E2E simule un **vrai utilisateur** interagissant avec l'application dans un navigateur réel (Chrome, Firefox). Le robot :
- Ouvre le navigateur automatiquement
- Navigue vers les pages
- Remplit des formulaires
- Clique sur des boutons
- Vérifie que les résultats attendus sont bien présents

### Objectifs des tests

| Objectif | Description |
|---|---|
| **Régression** | Détecter automatiquement si une nouvelle modification casse une fonctionnalité existante |
| **Validation** | Vérifier que chaque rôle (Manager, Testeur, Admin) accède aux bonnes pages |
| **Sécurité** | S'assurer que les menus non autorisés sont bien masqués selon le rôle |
| **Fonctionnalité** | Tester les interactions clés : recherche, filtres, ouverture de détails |

---

## 2. Prérequis et Installation

### Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Docker Desktop en cours d'exécution (pour le backend Django)

### Installation de Playwright

Depuis le dossier `project/` :

```bash
# 1. Installer le package @playwright/test
npm install --save-dev @playwright/test

# 2. Installer les navigateurs (Chromium, Firefox, WebKit)
npx playwright install

# 3. Vérifier l'installation
npx playwright --version
```

### Structure du projet après installation

```
project/
├── playwright.config.ts        ← Configuration globale
├── tests/
│   ├── helpers/
│   │   └── auth.ts             ← Fonctions de connexion centralisées
│   ├── login.spec.ts           ← Tests page de connexion
│   ├── manager/
│   │   ├── auth.setup.ts       ← Authentification Manager (1 seule fois)
│   │   ├── dashboard.spec.ts   ← Tests Dashboard
│   │   ├── campaigns.spec.ts   ← Tests Campagnes
│   │   ├── releases.spec.ts    ← Tests Releases
│   │   ├── anomalies.spec.ts   ← Tests Anomalies
│   │   ├── ai_ml.spec.ts       ← Tests IA & ML
│   │   └── .auth/
│   │       └── manager.json    ← Session sauvegardée (auto-généré)
│   └── tester/
│       ├── auth.setup.ts       ← Authentification Testeur (1 seule fois)
│       ├── execution.spec.ts   ← Tests Espace Testeur
│       └── .auth/
│           └── tester.json     ← Session sauvegardée (auto-généré)
└── test-results/               ← Résultats et captures d'écran (auto-généré)
```

---

## 3. Architecture des Tests

### Organisation par rôle

Les tests sont organisés par **rôle utilisateur**, reflétant l'architecture réelle de la plateforme :

```
Tests InsureTM
│
├── 🔐 Login (tests communs)
│   └── Vérification formulaire, 2FA
│
├── 👔 Manager
│   ├── Dashboard & KPIs
│   ├── Gestion des Campagnes
│   ├── Gestion des Releases
│   ├── Gestion des Anomalies
│   └── Intelligence IA & ML
│
└── 🧪 Testeur
    ├── Mon Espace
    └── Suivi d'Exécution
```

### Principe du storageState (Session partagée)

Chaque groupe de tests utilise un mécanisme de **session partagée** pour éviter de se connecter à chaque test :

```
auth.setup.ts          dashboard.spec.ts    campaigns.spec.ts
─────────────          ─────────────────    ─────────────────
1. Se connecte    →    Utilise la           Utilise la
2. Entre le 2FA   →    session              session
3. Sauvegarde          sauvegardée          sauvegardée
   la session          (pas de login)       (pas de login)
```

**Avantage** : Un seul code 2FA reçu par mail pour toute la suite de tests.

---

## 4. Configuration Playwright

Fichier : `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,        // Timeout max par test : 60 secondes
  use: {
    baseURL: 'http://localhost:5173',  // URL de l'application React (Vite)
    trace: 'on-first-retry',           // Capture la trace en cas d'échec
    launchOptions: {
      slowMo: 1000,           // 1 seconde entre chaque action (pour visualiser)
    },
  },
  projects: [
    { name: 'manager-setup', ... },  // Connexion Manager (1 fois)
    { name: 'manager', ... },        // Tests Manager (session réutilisée)
    { name: 'tester-setup', ... },   // Connexion Testeur (1 fois)
    { name: 'tester', ... },         // Tests Testeur (session réutilisée)
    { name: 'chromium', ... },       // Tests généraux (login, etc.)
  ],
  webServer: {
    command: 'npm run dev',           // Lance Vite automatiquement avant les tests
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
```

---

## 5. Système d'Authentification

### Fichier `tests/helpers/auth.ts`

Ce fichier centralise toute la logique de connexion. **Principe DRY** : si un mot de passe change, on ne modifie qu'un seul fichier.

```typescript
const CREDENTIALS = {
  admin:   { username: 'admin',   password: '...' },
  manager: { username: 'manager', password: '...' },
  tester:  { username: 'tester',  password: '...' },
};
```

#### Fonctions exportées

| Fonction | Usage | 2FA |
|---|---|---|
| `loginAsManager(page)` | Connexion simple | Non |
| `loginAsTester(page)` | Connexion simple | Non |
| `loginAsManagerWith2FA(page)` | Connexion + pause pour 2FA | ✅ Oui |
| `expectLoginSuccess(page)` | Vérifie si la connexion a réussi | — |

### Fichiers `auth.setup.ts` (par rôle)

Ces fichiers s'exécutent **une seule fois** avant tous les tests du rôle correspondant. Ils gèrent la Double Authentification (2FA) de manière interactive :

```
1. Ouvre /login
2. Remplit les identifiants
3. Clique sur "Se connecter"
4. ⏸️ PAUSE → Vous entrez le code 2FA dans le navigateur
5. Cliquez ▶️ Resume dans l'inspecteur Playwright
6. La session est sauvegardée dans .auth/[role].json
```

---

## 6. Catalogue des Tests

### 6.1 Tests de Connexion — `login.spec.ts`

**Projet** : `chromium` | **Authentification** : aucune

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Vérification de l'affichage | Le bouton Submit, les champs username et password sont visibles |
| 2 | Connexion avec identifiants valides | Après saisie du mot de passe, le formulaire 2FA apparaît |

**Logique du test 2 (adaptatif)** :
```
Si URL = "/" → ✅ Connexion directe réussie
Sinon si champ 2FA visible → ✅ Comportement 2FA normal
Sinon → ❌ Erreur d'authentification détectée
```

---

### 6.2 Manager — Dashboard

**Fichier** : `tests/manager/dashboard.spec.ts`  
**Projet** : `manager` | **Session** : `manager.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Dashboard principal visible | Un titre H1/H2 est présent après connexion |
| 2 | Navigation vers les Campagnes | La page `/campaigns` charge avec du contenu |
| 3 | Navigation vers les Releases | La page `/releases` charge avec du contenu |
| 4 | Navigation vers les Anomalies | La page `/anomalies` charge avec du contenu |

---

### 6.3 Manager — Campagnes

**Fichier** : `tests/manager/campaigns.spec.ts`  
**Projet** : `manager` | **Session** : `manager.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Liste des campagnes visible | La page charge correctement |
| 2 | Recherche dans les campagnes | Le champ de recherche accepte une saisie |
| 3 | Filtres fonctionnels | Les listes déroulantes de filtre sont utilisables |
| 4 | Ouverture du détail d'une campagne | Un clic sur une ligne ouvre le détail |
| 5 | Bouton de création visible | Le bouton "Créer/Nouvelle campagne" est accessible |

---

### 6.4 Manager — Releases

**Fichier** : `tests/manager/releases.spec.ts`  
**Projet** : `manager` | **Session** : `manager.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Liste des releases visible | La page charge correctement |
| 2 | Filtre par statut | Le filtre Actif/Terminé fonctionne |
| 3 | Release Readiness Score affiché | La jauge de score de prêt est présente |
| 4 | Pagination | Les contrôles de pagination sont disponibles |

---

### 6.5 Manager — Anomalies

**Fichier** : `tests/manager/anomalies.spec.ts`  
**Projet** : `manager` | **Session** : `manager.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Liste des anomalies visible | La page charge correctement |
| 2 | Filtre par criticité | Les filtres Faible/Moyenne/Critique fonctionnent |
| 3 | Recherche dans les anomalies | La barre de recherche est fonctionnelle |
| 4 | Ouverture du détail d'une anomalie | Un clic ouvre le panneau de détail/modale |

---

### 6.6 Manager — Intelligence IA & ML

**Fichier** : `tests/manager/ai_ml.spec.ts`  
**Projet** : `manager` | **Session** : `manager.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Page Data-Driven Manager accessible | La page IA charge avec un titre |
| 2 | Agent Analytics visible | Le widget de chat IA est présent |
| 3 | Indicateurs ML Timeline Guard | Les jauges/scores de prédiction sont affichés |
| 4 | Section Recommandations Testeurs | La section ML de recommandation est visible |

---

### 6.7 Testeur — Espace & Exécution

**Fichier** : `tests/tester/execution.spec.ts`  
**Projet** : `tester` | **Session** : `tester.json`

| # | Nom du test | Ce qui est vérifié |
|---|---|---|
| 1 | Session Testeur active | L'URL n'est pas `/login` (session confirmée) |
| 2 | Accès à Mon Espace | La page `/tester` charge avec du contenu |
| 3 | Accès au suivi d'exécution | Détection automatique de l'URL correcte parmi plusieurs candidats |
| 4 | Menu Admin masqué | Aucun lien `/admin` n'est visible pour un Testeur |

---

## 7. Commandes de Lancement

> ⚠️ Toutes les commandes doivent être exécutées depuis le dossier `project/`

### Lancer un fichier de test spécifique

```bash
npx playwright test tests/manager/dashboard.spec.ts --headed
```

### Lancer tous les tests Manager (avec 2FA une seule fois)

```bash
npx playwright test --project=manager-setup --project=manager --headed
```

### Lancer tous les tests Testeur

```bash
npx playwright test --project=tester-setup --project=tester --headed
```

### Lancer les tests de Login

```bash
npx playwright test tests/login.spec.ts --headed
```

### Options utiles

| Option | Effet |
|---|---|
| `--headed` | Ouvre le navigateur de manière visible |
| `--workers=1` | N'ouvre qu'un seul navigateur à la fois |
| `--debug` | Active la pause `page.pause()` pour saisie 2FA manuelle |

> **Note** : Le ralentissement (`slowMo`) est configuré directement dans `playwright.config.ts` via `launchOptions.slowMo`.

---

## 8. Résultats et Rapports

### Lecture des résultats dans le terminal

```
✅ Dashboard Manager chargé          ← Test réussi
ℹ️ Pagination non visible            ← Information (pas un échec)
❌ Échec détecté                      ← Erreur
```

### Signification des codes de statut

| Symbole | Signification |
|---|---|
| ✅ | Test réussi, fonctionnalité confirmée |
| ℹ️ | Information contextuelle (données absentes, non bloquant) |
| ❌ | Échec — fonctionnalité cassée ou URL incorrecte |

### Générer un rapport HTML complet

```bash
npx playwright show-report
```

Ce rapport affiche pour chaque test :
- La capture d'écran au moment de l'échec
- La trace réseau (requêtes API)
- La vidéo de l'exécution (si configuré)

---

## 9. Concepts Clés Expliqués

### Page Object vs Helpers

Dans cette suite, nous utilisons des **helpers** (fonctions partagées) plutôt que des Page Objects complets, pour rester simples et lisibles à ce stade du projet.

### `page.locator()` vs `page.$$()`

Nous utilisons exclusivement `page.locator()` car il attend automatiquement que l'élément soit disponible (lazy evaluation), contrairement à `page.$$()` qui échoue si l'élément n'est pas encore rendu.

### `await page.waitForTimeout()`

Utilisé pour laisser les composants React finir leur rendu après une navigation. Dans un projet de production, on préfèrerait `await page.waitForSelector()` qui est plus fiable, mais `waitForTimeout` est suffisant pour cette démonstration.

### Différence entre `toBeVisible()` et `isVisible()`

```typescript
// Syntaxe assertion — échoue si false
await expect(element).toBeVisible();

// Syntaxe booléenne — retourne true/false sans faire échouer le test
const visible = await element.isVisible();
if (visible) { ... }
```

---

*Documentation générée pour le projet InsureTM — Plateforme de Test Management — Lloyd Assurances*  
*Stack : React 19 / Vite · Django 5 / DRF · PostgreSQL · Playwright 1.x*
