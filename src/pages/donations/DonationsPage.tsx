import AddRounded from '@mui/icons-material/AddRounded';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion } from '@/components/ui/Skeleton';
import { useAuth } from '@/core/auth/useAuth';
import { useInfiniteTrigger } from '@/core/hooks/useInfiniteTrigger';
import { MY_ITEMS_TABS, useMyItemCounts, useMyItems } from '@/core/hooks/useMyItems';
import type { ItemStatus } from '@/core/types/api';
import { stagger } from '@/core/utils/motion';
import { MyItemCard, MyItemCardSkeleton } from '@/features/donations/MyItemCard';

/** Status na URL em português curto (como os filtros do feed): `?status=negociacao`. */
const SLUGS: Record<ItemStatus, string> = { DISPONIVEL: 'disponivel', EM_PROGRESSO: 'negociacao', DOADO: 'doado' };
const fromSlug = (slug: string | null) => (Object.keys(SLUGS) as ItemStatus[]).find((s) => SLUGS[s] === slug);

/**
 * "Doações" (guia, F7.5 e F8.1): doador vê as próprias doações; ONG, os itens em que demonstrou interesse.
 * Abas por status com o número de cada uma (decisão da fase 4), status na URL e scroll infinito.
 */
export default function DonationsPage() {
  const { t } = useTranslation(['donations', 'common']);
  const { user } = useAuth();
  const role = user?.role === 'NGO' ? 'NGO' : 'DONOR';
  const [params, setParams] = useSearchParams();
  const status = fromSlug(params.get('status'));
  const counts = useMyItemCounts();
  const list = useMyItems(status);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };
  const sentinel = useInfiniteTrigger(loadMore, Boolean(hasNextPage) && !isFetchingNextPage);

  const setStatus = (s: ItemStatus | undefined) => setParams(s ? { status: SLUGS[s] } : {}, { replace: true });

  const items = list.data?.items ?? [];
  const tabLabel = (s: ItemStatus | undefined, i: number) => {
    const label = s ? t(`mine.status.${s}`) : t('mine.all');
    return counts[i] === undefined ? label : `${label} (${counts[i]})`;
  };

  let content;
  if (list.isPending) {
    content = (
      <LoadingRegion label={t('mine.loading')} className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <MyItemCardSkeleton key={i} />
        ))}
      </LoadingRegion>
    );
  } else if (list.isError && items.length === 0) {
    content = (
      <EmptyState
        illustration="error"
        title={t('mine.errorTitle')}
        description={t('mine.errorDescription')}
        action={<Button onClick={() => void list.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (items.length === 0) {
    content = status ? (
      <EmptyState illustration="empty" title={t('mine.emptyStatus')} />
    ) : role === 'DONOR' ? (
      <EmptyState
        illustration="empty"
        title={t('mine.emptyDonorTitle')}
        description={t('mine.emptyDonorDescription')}
        action={
          <Button to="/donations/new" icon={<AddRounded />}>
            {t('new.button')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        illustration="empty"
        title={t('mine.emptyNgoTitle')}
        description={t('mine.emptyNgoDescription')}
        action={
          <Button to="/feed" variant="secondary">
            {t('mine.goFeed')}
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <ul className="flex flex-col gap-4">
          {items.map((item, i) => (
            <li key={item.id} className="animate-fade-up" style={stagger(i % 12)}>
              <MyItemCard item={item} role={role} />
            </li>
          ))}
          {isFetchingNextPage && (
            <li>
              <MyItemCardSkeleton />
            </li>
          )}
        </ul>
        <div ref={sentinel} className="mt-6 flex justify-center">
          {hasNextPage && (
            <Button variant="secondary" loading={isFetchingNextPage} onClick={loadMore}>
              {t('common:actions.loadMore')}
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8"
      aria-labelledby="mine-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography id="mine-title" variant="h4" component="h2" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          {role === 'DONOR' ? t('mine.titleDonor') : t('mine.titleNgo')}
        </Typography>
        {role === 'DONOR' && (
          <Button to="/donations/new" icon={<AddRounded />}>
            {t('new.button')}
          </Button>
        )}
      </div>
      <Tabs
        value={MY_ITEMS_TABS.indexOf(status)}
        onChange={(_, i: number) => setStatus(MY_ITEMS_TABS[i])}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t('mine.tabs')}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {MY_ITEMS_TABS.map((s, i) => (
          <Tab key={s ?? 'all'} label={tabLabel(s, i)} />
        ))}
      </Tabs>
      {content}
    </section>
  );
}
