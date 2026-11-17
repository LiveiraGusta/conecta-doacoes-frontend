import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';

/**
 * Texto de erro de um campo. As mensagens do Zod são chaves de tradução ("validation:cnpj");
 * as que vêm da API já chegam em português e aparecem como estão.
 */
export function useErrorText() {
  const { t, i18n } = useTranslation();
  return (message?: string) =>
    message && message.includes(':') && i18n.exists(message) ? t(message as never) : message;
}

/** Visual comum dos campos de texto e select. */
export const inputClass = (invalid: boolean) =>
  cn(
    'h-11 w-full rounded-xl border bg-surface px-3 text-base text-fg outline-none transition-colors placeholder:text-fg-muted/70',
    'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 disabled:opacity-60',
    invalid ? 'border-danger' : 'border-border',
  );
