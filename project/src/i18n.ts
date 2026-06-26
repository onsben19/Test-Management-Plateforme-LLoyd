import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en }
        },
        fallbackLng: 'fr',
        defaultNS: 'translation',
        ns: ['translation'],
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        react: {
            useSuspense: false, // Avoid blocking React 19 if translations are loading
        },
        detection: {
            order: ['localStorage', 'cookie', 'navigator'],
            caches: ['localStorage', 'cookie'],
        },
        debug: import.meta.env.DEV,
    });

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng.split('-')[0].toLowerCase();
});
if (typeof document !== 'undefined') {
    document.documentElement.lang = (i18n.language || 'fr').split('-')[0].toLowerCase();
}

export default i18n;
