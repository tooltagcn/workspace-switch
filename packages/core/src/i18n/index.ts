import i18next from 'i18next';
import { en } from './en.js';
import { zh } from './zh.js';

let initialized = false;

export async function initI18n(language = 'en'): Promise<typeof i18next> {
  if (initialized && i18next.language === language) return i18next;

  await i18next.init({
    lng: language,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  initialized = true;
  return i18next;
}

export function t(key: string, options?: Record<string, unknown>): string {
  if (!initialized) {
    i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: en },
        zh: { translation: zh },
      },
      interpolation: { escapeValue: false },
    });
    initialized = true;
  }
  return i18next.t(key, options);
}

export function changeLanguage(language: string): Promise<void> {
  return i18next.changeLanguage(language) as unknown as Promise<void>;
}

export function resetI18n(): void {
  initialized = false;
}
