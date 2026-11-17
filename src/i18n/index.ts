import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import auth from './pt-BR/auth.json';
import common from './pt-BR/common.json';
import donations from './pt-BR/donations.json';
import feed from './pt-BR/feed.json';
import validation from './pt-BR/validation.json';

/** Textos por domínio (namespace). Cada fase acrescenta o seu arquivo em pt-BR/. */
export const resources = {
  'pt-BR': { common, validation, auth, feed, donations },
} as const;

export const defaultNS = 'common';

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  defaultNS,
  ns: ['common', 'validation', 'auth', 'feed', 'donations'],
  interpolation: { escapeValue: false }, // o React já escapa
  returnNull: false,
});

export default i18n;
