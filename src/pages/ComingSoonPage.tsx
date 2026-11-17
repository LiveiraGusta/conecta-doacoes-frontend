import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageTitle } from '@/core/hooks/usePageTitle';

/**
 * Placeholder das telas das próximas fases (as rotas e os guards já funcionam).
 * Cada fase troca o `lazy` da sua rota pela página real.
 */
export function ComingSoonPage({ phase }: { phase: number }) {
  const { t } = useTranslation();
  const title = usePageTitle();
  return <EmptyState illustration="empty" title={title} description={t('system.comingSoon', { phase })} />;
}

// Um componente por rota (o `lazy` do router não passa props).
export const AdminPlaceholder = () => <ComingSoonPage phase={7} />;
