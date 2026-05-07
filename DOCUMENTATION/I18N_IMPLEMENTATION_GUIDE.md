# Guide d'Implémentation : Internationalisation (i18n)

Ce document décrit le processus et les bonnes pratiques pour l'implémentation de la traduction internationale (i18n) dans l'application InsureTM, en prenant comme exemple la récente mise à jour du composant `HistoricalAnalyticsDashboard`.

---

## 1. Comprendre le Problème

Lors de la création ou de la modernisation de composants (comme les onglets "Qualité", "Performance", etc.), il est fréquent d'écrire initialement les textes en "dur" (hardcoded) dans le code source :
```tsx
// ❌ Mauvaise pratique (texte en dur)
<h3 className="title">Comparatif Qualité des Releases</h3>
```
Le problème de cette approche est que lorsque l'utilisateur bascule l'application en anglais via le sélecteur de langue, ces composants restent bloqués en français.

---

## 2. L'Architecture i18n d'InsureTM

L'application utilise **react-i18next**. Le système de traduction repose sur deux éléments principaux :
1. **Les fichiers de locales (JSON)** : Contiennent les dictionnaires de traduction par langue (`src/locales/fr.json` et `src/locales/en.json`).
2. **Le Hook `useTranslation`** : Permet aux composants React d'accéder aux traductions en temps réel.

---

## 3. Étapes d'Implémentation (Exemple Pratique)

Voici les étapes exactes qui ont été suivies pour corriger la traduction du composant `HistoricalAnalyticsDashboard`.

### Étape A : Définir les clés dans les fichiers JSON
Plutôt que d'écrire des phrases, on crée une hiérarchie de clés. 
Nous avons injecté le bloc suivant dans `src/locales/fr.json` (et son équivalent traduit dans `en.json`) :

```json
"historicalAnalytics": {
    "title": "Analytics Historiques",
    "titleAll": "Analytics Plateforme",
    "subtitle": "Tendances sur {{count}} releases",
    "liveAggregation": "Live Aggregation",
    "tabs": {
        "quality": "Qualité",
        "velocity": "Performance",
        "strat": "Stratégie"
    },
    "qualityTab": {
        "title": "Comparatif Qualité des Releases",
        "table": "Tableau",
        "chart": "Graphique",
        "successRate": "Taux de Succès",
        "empty": "Aucune release trouvée pour ce projet."
    }
}
```

> **Astuce d'interpolation** : Remarquez le `{{count}}`. Cela permet d'injecter des variables dynamiques (ex: le nombre de releases) directement dans la chaîne traduite.

### Étape B : Importer et initialiser le Hook
Dans le fichier du composant (`src/pages/manager/components/HistoricalAnalyticsDashboard.tsx`), il faut importer le module et extraire la fonction `t` :

```tsx
// 1. Importation
import { useTranslation } from 'react-i18next';

const HistoricalAnalyticsDashboard = ({ projectId }: { projectId: string }) => {
    // 2. Initialisation du hook
    const { t } = useTranslation();
    
    // ...
}
```

### Étape C : Remplacer les textes par la fonction `t()`
Tous les textes statiques ont été remplacés par la fonction `t('chemin.de.la.cle')`.

**Exemple 1 : Texte simple**
```tsx
// Avant
<span>Qualité</span>

// Après
<span>{t('historicalAnalytics.tabs.quality')}</span>
```

**Exemple 2 : Texte conditionnel (Ternaire)**
```tsx
// Avant
<h2>{projectId === 'all' ? 'Analytics Plateforme' : 'Analytics Historiques'}</h2>

// Après
<h2>{projectId === 'all' ? t('historicalAnalytics.titleAll') : t('historicalAnalytics.title')}</h2>
```

**Exemple 3 : Texte avec variable interpolée**
```tsx
// Avant
<p>Tendances sur {releaseData.length} releases</p>

// Après
<p>{t('historicalAnalytics.subtitle', { count: releaseData.length || 6 })}</p>
```

---

## 4. Règles d'Or pour les prochains développements

1. **Ne jamais laisser de texte statique** : Dès la création d'un composant UI, pensez "Clé i18n".
2. **Garder les clés organisées** : Groupez les traductions par module ou par composant (ex: `"managerDashboard"`, `"historicalAnalytics"`) pour éviter les conflits dans les gros fichiers JSON.
3. **Mettre à jour les deux langues simultanément** : Si vous ajoutez une clé dans `fr.json`, ajoutez immédiatement son équivalent dans `en.json` pour éviter que l'application n'affiche les clés techniques brutes à l'écran en cas de manque.
4. **Gérer les pluriels** : i18next gère nativement la pluralisation en utilisant les suffixes `_zero`, `_one`, `_other`. L'utiliser évite de faire des ternaires complexes dans le TSX.
