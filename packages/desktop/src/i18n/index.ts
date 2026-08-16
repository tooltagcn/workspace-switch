import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import { api } from '../lib/ipc.js';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Restore the persisted language choice (set in Settings).
api
  .getSetting('language')
  .then((lang) => {
    if (lang) i18n.changeLanguage(lang);
  })
  .catch(() => {});

export default i18n;
