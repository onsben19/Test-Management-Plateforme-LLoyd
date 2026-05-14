# Tableau des Formules Mathématiques du Projet

Ce document regroupe l'ensemble des formules mathématiques et logiques utilisées dans les services d'analyse et de Machine Learning du projet InsureTM.

## 1. Timeline Guard (Prédiction de Calendrier)

Ces formules sont utilisées pour estimer la date de fin d'une campagne et évaluer le niveau de risque.

| Concept | Formule | Variables |
| :--- | :--- | :--- |
| **Vélocité** | $V = \frac{C_f}{D_e}$ | $C_f$ : Cas de tests terminés<br>$D_e$ : Jours écoulés ($D_e \ge 1$) |
| **Jours Linéaires Restants** | $D_l = \lceil \frac{C_t - C_f}{V} \rceil$ | $C_t$ : Total des cas de tests<br>$V$ : Vélocité |
| **Jours Prédits (Garde-fou)** | $D_p = \min(D_{ml}, D_l)$ | $D_{ml}$ : Jours prédits par le modèle Random Forest<br>$D_l$ : Jours linéaires restants |

---

## 2. Score d'Aptitude des Testeurs (Tester Fitness Score)

Le score d'aptitude évalue la performance d'un testeur sur une échelle de 0 à 100.

| Métrique | Formule | Description | Poids |
| :--- | :--- | :--- | :--- |
| **Taux de Succès** ($S$) | $S = \frac{C_{passed}}{C_{total}} \times 100$ | Pourcentage de tests réussis. | 40% |
| **Vélocité Récente** ($V_s$) | $V_s = \min(100, \frac{C_{7d}}{7} \times 10)$ | Basé sur le nombre de tests exécutés les 7 derniers jours. | 30% |
| **Fiabilité** ($R$) | $R = \frac{D_{active}}{14} \times 100$ | Pourcentage de jours actifs (au moins 1 test) sur les 14 derniers jours. | 30% |

**Score Final :**
$$Score = (S \times 0.4) + (V_s \times 0.3) + (R \times 0.3)$$

---

## 3. Score de Readiness (Release Readiness Score)

Le score de préparation à la release évalue la maturité d'un projet ou d'une campagne pour la mise en production.

| Composante | Formule / Logique | Poids Max |
| :--- | :--- | :--- |
| **Taux de Réussite** | $S_{pass} = \frac{C_{passed}}{C_{total}} \times 40$ | 40 pts |
| **Stabilité ML** | `OPTIMAL` $\rightarrow$ 30<br>`WARNING` $\rightarrow$ 20<br>`WAITING/INITIAL` $\rightarrow$ 10<br>`CRITICAL` $\rightarrow$ 0 | 30 pts |
| **Santé des Anomalies** | $\max(0, 20 - \frac{Pénalité}{2})$ | 20 pts |
| **Garde Fou Bloquant** | $10$ si 0 anomalie bloquante, sinon $0$ | 10 pts |

**Calcul de la Pénalité pour les Anomalies :**
$$Pénalité = (N_{bloquante} \times 30) + (N_{critique} \times 15) + (N_{majeur/mineur} \times 5) + (N_{autre} \times 2)$$

**Score Global :**
$$Score = S_{pass} + Score_{ML} + Score_{Anomalie} + Score_{Bloquant}$$
