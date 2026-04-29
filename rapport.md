# RAPPORT DE STAGE DE FIN D'ÉTUDES
## Sujet : Conception et Réalisation d'une Plateforme IA de Gestion de Recette Applicative (InsureTM)

**Organisme d'accueil :** Lloyd Assurances
**Réalisé par :** [Votre Nom]
**Encadrant Entreprise :** [Nom de l'encadrant]
**Année Universitaire :** 2025 - 2026

---

## REMERCIEMENTS

Je tiens à exprimer ma profonde gratitude à Lloyd Assurances pour m'avoir accueilli dans le cadre de ce projet de fin d'études... (À personnaliser avec le nom de vos collègues et tuteurs).

---

## INTRODUCTION GÉNÉRALE

Mon intégration au sein de **Lloyd Assurances** est intervenue à un moment charnière de la transformation digitale de l'entreprise. J'ai rapidement pu constater que, malgré une infrastructure informatique robuste, la phase finale de validation des logiciels — la recette applicative — reposait encore sur des processus manuels fragmentés. Le suivi des tests sur des feuilles de calcul et la communication par emails créaient parfois des zones d'ombre, ralentissant la mise en production de services critiques pour les assurés.

Face à ce constat, mon objectif n'était pas seulement de créer un outil de gestion supplémentaire, mais de concevoir un compagnon intelligent pour les équipes de qualité. C’est ainsi qu’est né **InsureTM**. Ce projet représente pour moi le point de rencontre entre les exigences de rigueur du secteur de l'assurance et les capacités d'analyse de l'Intelligence Artificielle.

Pour mener à bien ce projet, nous avons adopté une **méthodologie hybride**, alliant la rigueur de la conception structurée à la flexibilité de la méthode agile **Scrum**, garantissant ainsi une livraison itérative et alignée sur les besoins métiers de Lloyd Assurances.

Ce rapport détaille les différentes phases de réalisation de ce projet et s'articule autour de six chapitres :

*   Le **premier chapitre** présente le cadre général du projet, l'organisme d'accueil et la problématique identifiée sur le terrain.
*   Le **deuxième chapitre** est consacré à l'étude préliminaire, l'analyse des besoins et la conception de l'architecture technique.
*   Le **troisième chapitre** détaille la première release focalisée sur la sécurité des accès et la gestion des utilisateurs.
*   Le **quatrième chapitre** expose le cœur de la plateforme dédié à la gestion des campagnes et du suivi QA.
*   Le **cinquième chapitre** met en lumière l'intégration de l'intelligence artificielle et des moteurs de recommandation ML.
*   Enfin, le **sixième chapitre** traite de l'infrastructure DevOps et de l'automatisation des tests avec Playwright.

Nous conclurons ce travail par un bilan de notre expérience et une présentation des perspectives d'évolution de la plateforme.

---

## CHAPITRE 1 : CONTEXTE GLOBAL DU PROJET

### 1.1 INTRODUCTION
Ce premier chapitre pose les bases de mon travail de fin d'études. Je vais y présenter mon organisme d'accueil, Lloyd Assurances, ainsi que le contexte métier qui a justifié la naissance du projet InsureTM. J'y détaillerai la problématique que j'ai identifiée sur le terrain, l'étude de l'existant et enfin la méthodologie hybride que j'ai adoptée pour mener ce projet de l'idée jusqu'à la production.

### 1.2 PRÉSENTATION DE L'ORGANISME D'ACCUEIL : LLOYD ASSURANCES
Lloyd Assurances est une compagnie d'assurances tunisienne de premier plan, reconnue pour son expertise et sa capacité d'innovation constante. Forte de plusieurs décennies d'expérience, elle propose une vaste gamme de produits (Auto, Santé, Vie, Habitation). Le département informatique de Lloyd, où j'ai effectué mon stage, est le moteur technologique de l'entreprise, assurant la performance des outils utilisés quotidiennement par les agents et les clients.

### 1.3 PRÉSENTATION DU PROJET : INSURETM
InsureTM (Insurance Test Management) est une plateforme conçue pour centraliser et automatiser le suivi de la qualité logicielle. Il s'agit d'une application web de type SPA (Single Page Application) dont l'originalité réside dans l'utilisation de l'intelligence artificielle pour assister le manager dans ses décisions critiques et le testeur dans ses tâches répétitives.

### 1.4 PROBLÉMATIQUE
Lors de mon observation des cycles de développement chez Lloyd Assurances, j'ai identifié plusieurs points de friction majeurs liés à la validation logicielle :

1.  **Fragmentation des Données** : Les plans de tests étaient souvent dispersés dans des fichiers Excel indépendants, rendant difficile la vision consolidée de l'avancement d'un grand projet.
2.  **Perte de Temps en Reporting** : Les managers passaient une part importante de leur temps à collecter manuellement des données via emails ou chat pour générer des comptes-rendus de recette.
3.  **Risque sur la Qualité Critique** : Dans le secteur de l'assurance, une erreur de calcul de prime ou une faille de sécurité peut avoir des conséquences financières graves. Le système manuel actuel ne permettait pas de prioriser dynamiquement les tests les plus risqués.
4.  **Absence d'Historique de Performance** : Sans base de données centrale, il était complexe d'analyser la vélocité des testeurs sur le long terme pour optimiser les futurs plannings.

**La question centrale de mon projet est donc :** "Comment transformer un processus de recette manuel, lent et fragmenté en un écosystème collaboratif, intelligent et automatisé ?"

### 1.5 MÉTHODOLOGIE ADOPTÉE
Pour répondre aux exigences de Lloyd Assurances en termes de rigueur et de délais, j'ai opté pour une **approche hybride** :

*   **Processus Unifié (UP)** : Pour structurer le projet en phases logiques (Inception, Elaboration, Construction, Transition) et garantir que l'architecture technique est solide avant le développement massif.
*   **Méthode Agile (Scrum)** : Pour la phase de construction, afin de livrer des fonctionnalités par itérations (Sprints) et d'intégrer les retours des utilisateurs métiers (testeurs et managers) au fur et à mesure.

### 1.6 CONCLUSION
Ce premier chapitre a permis de situer le projet dans son environnement. Nous avons vu que Lloyd Assurances nécessite un outil moderne pour sécuriser ses mises en production. Nous allons maintenant passer au **Chapitre 2**, dédié à l'analyse approfondie de ces besoins et à la conception de la solution technique qui répondra à ces défis.

---

## CHAPITRE 2 : ÉTUDE PRÉLIMINAIRE ET ANALYSE DES BESOINS

### 2.1 INTRODUCTION
L'analyse des besoins est une étape cruciale pour garantir que le produit final correspond aux attentes réelles des utilisateurs de Lloyd Assurances. Dans ce chapitre, nous allons définir les fonctionnalités essentielles de la plateforme InsureTM, modéliser les interactions via des cas d'utilisation et poser les bases de l'architecture logicielle et physique qui soutiendra le système.

### 2.2 ANALYSE DES BESOINS

#### 2.2.1 Besoins Fonctionnels
Les besoins fonctionnels décrivent les actions que le système doit permettre de réaliser. Pour InsureTM, ils se répartissent en trois pôles principaux :

*   **Gestion des Tests (QA Heart)** : Création de cas de tests, organisation en campagnes de recette, exécution et suivi des statuts en temps réel.
*   **Pilotage et Reporting (Manager Dashboard)** : Visualisation de la vélocité, calcul automatique du score de readiness (prêt pour la mise en production) et génération de rapports PDF.
*   **Intelligence Artificielle (AI Suite)** : Recommandation de testeurs par Machine Learning, analyse de sentiment dans les commentaires et synthèse automatique des points de blocage par LLM.

#### 2.2.2 Besoins Non-Fonctionnels
Ces besoins garantissent la qualité de service et la robustesse du système :

*   **Sécurité** : Authentification forte via JWT et Double Facteur (2FA). Confidentialité des tests liés aux produits d'assurance.
*   **Réactivité** : Mise à jour en temps réel via WebSockets pour le chat et les indicateurs de performance.
*   **Ergonomie (Aesthetics)** : Interface moderne et intuitive (Glassmorphism) pour réduire le temps de formation des équipes.
*   **Disponibilité** : Architecture containerisée (Docker) pour garantir un déploiement stable et une maintenance facilitée.
