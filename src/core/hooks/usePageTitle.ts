import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from 'react-router';
import { useCachedUnread } from './useChats';

/** Metadado que cada rota declara em `handle` (routes/index.tsx). */
export interface RouteHandle {
  /** Chave de tradução do título (namespace common), mostrado no header e na aba do navegador. */
  titleKey?: string;
}

/**
 * Título da rota mais interna que declarou um; também atualiza o <title> da aba, com as não lidas na frente
 * ("(3) Conversas · Conecta Doações", decisão da fase 5).
 */
export function usePageTitle(): string {
  const matches = useMatches();
  const { t } = useTranslation();
  const key = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.titleKey)?.handle as
    RouteHandle | undefined;
  const title = key?.titleKey ? t(key.titleKey as never) : t('appName');

  const unread = useCachedUnread();
  useEffect(() => {
    const base = title === t('appName') ? title : `${title} · ${t('appName')}`;
    document.title = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ${base}` : base;
  }, [title, t, unread]);

  return title;
}
