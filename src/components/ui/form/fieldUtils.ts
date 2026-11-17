import { useTranslation } from 'react-i18next';

/**
 * Texto de erro de um campo. As mensagens do Zod são chaves de tradução ("validation:cnpj");
 * as que vêm da API já chegam em português e aparecem como estão.
 */
export function useErrorText() {
  const { t, i18n } = useTranslation();
  return (message?: string) =>
    message && message.includes(':') && i18n.exists(message) ? t(message as never) : message;
}
