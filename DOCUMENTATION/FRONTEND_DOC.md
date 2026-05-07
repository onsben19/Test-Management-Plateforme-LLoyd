# 🖥️ Documentation Frontend : Plateforme InsureTM

Cette documentation présente l'architecture, les technologies et les principes de conception de l'interface utilisateur d'InsureTM.

---

## 🛠️ 1. Stack Technologique

L'application est une **Single Page Application (SPA)** moderne construite avec :

-   **Framework Core** : React 18 avec Vite.
-   **Langage** : TypeScript.
-   **Styling** : TailwindCSS + Glassmorphism.
-   **Animations** : Framer Motion.
-   **Iconographie** : Lucide React.
-   **Gestion d'État & API** : Axios + Interceptors.

---

## 📂 2. Structure du Projet

```text
src/
├── components/         # Composants réutilisables (Tableaux, Modales, HUDs)
├── context/            # Contextes React (Authentification, Thème)
├── pages/              # Vues principales (Admin, Manager, Tester)
├── services/           # Couche de communication API (api.ts)
└── App.tsx             # Routes et Gardes de rôles
```

---

## ✨ 3. Philosophie de Design (UI/UX)

La plateforme adopte un style **"Premium Dark Mode"** :
1.  **Glassmorphism** : Effets de transparence et de flou (`backdrop-blur`).
2.  **Profondeur** : Gradients radiaux et ombres portées intenses.
3.  **Animations** : Transitions de pages et micro-interactions fluides.

---

## 🔑 4. Composants Clés

-   **`CatchupPlanIA`** : Visualisation de l'optimisation des ressources via ML.
-   **`ReadinessGauge`** : Score de préparation de release interactif.
-   **`AnalyticsChatWidget`** : Agent conversationnel pour l'analyse de données.
-   **`RoleGuard`** : Sécurité granulaire des accès par rôle.

---

## 📡 5. Communication API

-   **Gestion JWT** : Login, Logout et Refresh automatique intégrés dans Axios.
-   **Multipart Data** : Support natif pour l'upload de preuves d'exécution.

---

## 🚀 6. Installation

```bash
cd project
npm install
npm run dev
```
L'application sera disponible sur `http://localhost:5173`.
