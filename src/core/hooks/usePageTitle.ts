import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from 'react-router';

/** Metadado que cada rota declara em `handle` (routes/index.tsx). */
export interface RouteHandle {
  /** Chave de tradução do título (namespace common), mostrado no header e na aba do navegador. */
  titleKey?: string;
}

/** Título da rota mais interna que declarou um; também atualiza o <title> da aba. */
export function usePageTitle(): string {
  const matches = useMatches();
  const { t } = useTranslation();
  const key = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.titleKey)?.handle as
    RouteHandle | undefined;
  const title = key?.titleKey ? t(key.titleKey as never) : t('appName');

  useEffect(() => {
    document.title = title === t('appName') ? title : `${title} · ${t('appName')}`;
  }, [title, t]);

  return title;
}
