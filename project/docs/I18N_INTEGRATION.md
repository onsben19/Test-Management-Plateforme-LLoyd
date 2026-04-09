# Documentation: Intégration de l'Internationalisation (i18n)

Cette documentation détaille la mise en œuvre du support multilingue (Français/Anglais) au sein de la plateforme InsureTM.

## Architecture Technique

Le projet utilise les librairies suivantes :
- `i18next` : Framework de base pour l'internationalisation.
- `react-i18next` : Intégration spécifique pour React (hooks, composants).
- `i18next-browser-languagedetector` : Détection automatique de la langue de l'utilisateur (localStorage, navigateur).

## Structure des Fichiers

```text
src/
├── locales/
│   ├── fr.json         # Dictionnaire français (langue par défaut)
│   └── en.json         # Dictionnaire anglais
└── i18n.ts             # Configuration et initialisation d'i18next
```

## Configuration (`src/i18n.ts`)

L'initialisation configure :
- Les ressources (fichiers JSON).
- La langue de repli (`fallbackLng: 'fr'`).
- La détection automatique.
- L'interpolation (désactivation de l'échappement car React le gère nativement).

## Utilisation dans les Composants

### Hook `useTranslation`

C'est la méthode recommandée pour traduire des chaînes dans les composants fonctionnels.

```tsx
import { useTranslation } from 'react-i18next';

const MonComposant = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>{t('analytics.chat.welcome')}</p>
    </div>
  );
};
```

### Formatage des Dates

Pour garantir la cohérence du formatage des dates selon la langue sélectionnée, utilisez la clé `common.dateLocale` :

```tsx
const dateStr = new Date(date).toLocaleDateString(t('common.dateLocale'));
// Retourne "DD/MM/YYYY" en FR et "M/D/YYYY" en EN
```

## Maintenance des Dictionnaires

Lors de l'ajout d'une nouvelle clé :
1. Ajoutez-la dans `src/locales/fr.json`.
2. Ajoutez sa traduction dans `src/locales/en.json`.
3. Respectez la hiérarchie par module (ex: `execution.*`, `analytics.*`, `errors.*`).

## Changement de Langue

L'interface de changement de langue est intégrée dans le composant `Header.tsx`, permettant une bascule instantanée sans rechargement de page.
