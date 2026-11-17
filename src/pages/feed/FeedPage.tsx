import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderPortal } from '@/components/layout/HeaderSlot';
import { LazyLocationModal } from '@/components/layout/LazyLocationModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion } from '@/components/ui/Skeleton';
import { useAuth } from '@/core/auth/useAuth';
import { useFeed } from '@/core/hooks/useFeed';
import { useInfiniteTrigger } from '@/core/hooks/useInfiniteTrigger';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { CategoryBarDesktop, CategoryBarMobile } from '@/features/feed/CategoryBar';
import { ItemCard, ItemCardSkeleton } from '@/features/feed/ItemCard';
import { SearchBox } from '@/features/feed/SearchBox';
import { useFeedFilters } from '@/features/feed/useFeedFilters';

/**
 * Até 5 cards por linha (ajuste pedido depois da fase 6), pela largura da área do feed e não da tela
 * (container queries): com a barra lateral aberta, a tela larga não significa espaço largo.
 */
const GRID = 'grid gap-4 @sm:grid-cols-2 @2xl:grid-cols-3 @3xl:grid-cols-4 @[60rem]:grid-cols-5';

/**
 * Feed (guia, F7): busca no header (desktop) ou no topo (mobile), categorias, "Últimas doações (N)"
 * e a grade de cards com scroll infinito. `source`: filtros de outra URL (feed por trás do modal do item).
 */
export function FeedView({ source }: { source?: string }) {
  const { t } = useTranslation(['feed', 'common']);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const filters = useFeedFilters(source);
  const feed = useFeed(filters.filters);
  const [locationOpen, setLocationOpen] = useState(false);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };
  const sentinel = useInfiniteTrigger(loadMore, Boolean(hasNextPage) && !isFetchingNextPage);

  const search = (
    <HeaderPortal>
      <SearchBox value={filters.search} onSearch={(s) => filters.update({ search: s })} />
    </HeaderPortal>
  );
  const categoryProps = {
    value: filters.category,
    onChange: (c: typeof filters.category) => filters.update({ category: c }),
  };
  const items = feed.data?.items ?? [];

  let content;
  if (feed.isPending) {
    content = (
      <LoadingRegion label={t('list.loading')} className={GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </LoadingRegion>
    );
  } else if (feed.isError && items.length === 0) {
    content = (
      <EmptyState
        illustration="error"
        title={t('list.errorTitle')}
        description={t('list.errorDescription')}
        action={<Button onClick={() => void feed.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (items.length === 0) {
    content = filters.hasFilters ? (
      <EmptyState
        illustration="empty"
        title={t('list.notFoundTitle')}
        description={t('list.notFoundDescription')}
        action={
          <Button variant="secondary" onClick={filters.clear}>
            {t('list.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        illustration="empty"
        title={t('list.emptyTitle')}
        description={
          feed.mode === 'auth' && user ? t('list.emptyDescription', { city: user.city }) : t('list.emptyVisitor')
        }
      />
    );
  } else {
    content = (
      <>
        <div className={GRID}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
          {isFetchingNextPage && Array.from({ length: 3 }, (_, i) => <ItemCardSkeleton key={`more-${i}`} />)}
        </div>
        <div ref={sentinel} className="mt-8 flex justify-center">
          {hasNextPage ? (
            <Button variant="secondary" loading={isFetchingNextPage} onClick={loadMore}>
              {t('list.loadMore')}
            </Button>
          ) : (
            items.length > 6 && <Typography color="text.secondary">{t('list.end')}</Typography>
          )}
        </div>
      </>
    );
  }

  const total = feed.data?.total ?? 0;
  const showLocation = isMobile && feed.mode === 'auth' && user;

  return (
    <>
      {isMobile ? (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {search}
          {showLocation && (
            <Button
              variant="ghost"
              size="sm"
              icon={<LocationOnRounded />}
              onClick={() => setLocationOpen(true)}
              aria-label={`${t('location.change')}: ${user.city} - ${user.state}`}
              className="self-start"
            >
              {user.city} - {user.state}
            </Button>
          )}
          <CategoryBarMobile {...categoryProps} />
        </div>
      ) : (
        <>
          {search}
          <CategoryBarDesktop {...categoryProps} />
        </>
      )}
      <section className="@container px-4 py-6 md:px-8 md:py-8 lg:px-14" aria-labelledby="feed-title">
        <Typography id="feed-title" variant={isMobile ? 'h6' : 'h4'} component="h2" className="mb-6">
          {t(feed.mode === 'auth' ? 'list.title' : 'list.titleVisitor', { count: total })}
        </Typography>
        {content}
      </section>
      {showLocation && <LazyLocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />}
    </>
  );
}

export default function FeedPage() {
  return <FeedView />;
}
