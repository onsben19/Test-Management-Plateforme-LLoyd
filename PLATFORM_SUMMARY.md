# Dossier Technique de la Plateforme d'Analyse QA Intelligence Artificielle

## 1. Introduction
Dans le contexte actuel de développement logiciel agile, la rapidité et la qualité des tests (Assurance Qualité - QA) sont cruciales. Cette plateforme est une solution innovante visant à centraliser et automatiser l'analyse des données de test à l'aide de l'Intelligence Artificielle générative. Elle permet aux équipes de passer d'un suivi passif à une analyse prédictive et interactive de leurs campagnes de tests.

## 2. Problématique & Étude de l'existant

### Problématique
Les processus de QA traditionnels souffrent de plusieurs limites :
- **Lenteur d'analyse** : Les managers passent trop de temps à extraire des données manuellement (SQL, Excel) pour créer des rapports.
- **Complexité des données** : Les logs de test et les captures d'écran de bugs sont volumineux et difficiles à synthétiser rapidement.
- **Outils statiques** : Les tableaux de bord existants sont souvent rigides et ne permettent pas de poser des questions spécifiques sur le moment.

### Étude de l'existant
Les outils comme Jira, TestRail ou HP ALM offrent une bonne gestion des cas de test mais manquent souvent d'une couche d'intelligence conversationnelle. L'analyse des anomalies reste une tâche humaine répétitive et souvent déconnectée des outils de reporting dynamique.

## 3. Solutions Proposées
Notre plateforme propose une approche révolutionnaire basée sur trois piliers :
- **Agent Analytics Conversationnel** : Une interface de chat permettant d'interroger la base de données en langage naturel (Natural Language to SQL).
- **Visualisation Dynamique Immersive** : Génération automatique de graphiques Plotly.js et Recharts adaptés à la question de l'utilisateur, avec un focus sur la lisibilité et l'interactivité.
- **ML Timeline Guard (Prédiction)** : Un système prédictif qui estime la date de fin des campagnes et évalue les risques de retard en temps réel.

## 4. Spécification des Exigences

### Exigences Fonctionnelles (EF)
- **EF1** : Pouvoir interroger les données de campagnes, anomalies et projets en langage naturel.
- **EF2** : Générer des graphiques (Barres, Pie, Radar) exportables en PDF.
- **EF3** : Gérer les projets, campagnes et anomalies via une interface CRUD sécurisée.

### Exigences Non-Fonctionnelles (ENF)
- **🚀 Performance & Rapidité** : Utilisation de l'infrastructure Groq pour garantir des réponses IA en quasi temps réel (< 2 secondes) et un rendu fluide des graphiques.
- **🔒 Sécurité & Confidentialité** : 
  - Authentification sécurisée via **JWT**.
  - **RBAC (Role-Based Access Control)** : Injection dynamique de clauses de sécurité SQL selon le rôle (Admin, Manager, Tester) pour garantir que chaque utilisateur ne voit que ses propres données.
- **📈 Scalabilité & Disponibilité** : Architecture containerisée sous **Docker** avec un reverse-proxy **Nginx**, permettant une montée en charge facile et une isolation des services (Frontend, Backend, Database).
- **📱 Ergonomie & Accessibilité** : Interface moderne "Dark Mode" entièrement **responsive** (adaptable sur tablettes et mobiles) utilisant Tailwind CSS.
- **🛠️ Maintenabilité** : Séparation stricte des préoccupations (Clean Architecture) entre le moteur IA, le service de Machine Learning et l'interface utilisateur.

## 5. Méthodologie de Travail (HIBRID)
Le projet suit une **Méthodologie Hybride** pour concilier agilité et rigueur technique :
- **Agile (Scrum/Kanban)** : Pour le développement itératif du frontend et du backend, permettant des ajustements rapides basés sur les retours utilisateurs.
- **Cycle en V (Adapté)** : Pour la phase de conception des modèles d'IA et de la structure de la base de données, garantissant une stabilité des schémas complexes avant l'implémentation.
- **DevOps** : Intégration continue via Docker pour assurer une parité parfaite entre les environnements de développement et de production.

## 6. Technologies à utiliser

### Frontend (User Interface)
- **React.js (TypeScript)** : Pour une interface robuste et typée.
- **Tailwind CSS & Framer Motion** : Pour un design premium et des transitions fluides.
- **Plotly.js & Recharts** : Bibliothèques de visualisation de données haute performance.

### Backend (Core & Data)
- **Django REST Framework (Python)** : Pour une architecture API scalable et sécurisée.
- **PostgreSQL** : Système de gestion de base de données relationnelle.
- **Docker & Nginx** : Pour le déploiement et l'orchestration des services.

### Intelligence Artificielle & Machine Learning
- **Groq Cloud API** : Utilisation des modèles **Llama 3.3 (70B)** pour le raisonnement logique et la génération de requêtes SQL performantes.
- **Scikit-learn (ML local)** : Modèle **RandomForestRegressor** pour la prédiction des timelines de test.
- **Pandas & Joblib** : Pour le traitement des données et la persistance du modèle prédictif.
- **Prompt Engineering** : Système de directives strictes pour la génération de SQL et de configurations graphiques.

## 7. Module ML Prédictif : ML Timeline Guard
Le module de Machine Learning d'InsureTM apporte une dimension proactive à la gestion des tests.

### Fonctionnement Technique
1. **Extraction des Features** : Le système calcule la vélocité actuelle (tests/jour), le retard cumulé et le volume de travail restant.
2. **Inférence ML** : Un modèle **Random Forest** (entraîné sur des milliers de scénarios) prédit le nombre de jours restants.
3. **Analyse de Risque** : Le système compare la prédiction à la date limite (Deadline) et classe la campagne en 3 niveaux :
   - ✅ **OPTIMAL** : Dans les temps.
   - ⚠️ **WARNING** : Retard léger (1-5 jours).
   - 🚨 **CRITICAL** : Retard important (> 5 jours).
4. **Insights Contextuels** : L'IA Llama 3.3 analyse le résultat du ML pour fournir un conseil stratégique personnalisé.

### Sécurité et Fiabilité
- **Fallback Linéaire** : En cas d'indisponibilité du modèle ML, le système bascule automatiquement sur un calcul statistique linéaire pour garantir la continuité du service.
- **Apprentissage Continu** : Le modèle peut être ré-entraîné périodiquement avec les données réelles de la plateforme pour affiner sa précision.

---
*Document élaboré pour la Plateforme de Gestion de Tests Pilotée par l'IA.*
