import 'i18next';
import type { defaultNS, resources } from './index';

// Chaves de tradução tipadas: t('foundation.title') é checado pelo TypeScript.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['pt-BR'];
  }
}
