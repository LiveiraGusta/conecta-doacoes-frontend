import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useItem, type ItemView } from '@/core/hooks/useItem';
import { formatDateTime } from '@/core/utils/format';
import { InterestButton } from './InterestButton';
import { CityLine, DonorLine } from './itemParts';
import { PhotoCarousel } from './PhotoCarousel';

/** Conteúdo do detalhe (design-desktop-feed-item e design-mobile-feed): igual no modal e na página. */
export function ItemDetailContent({ item, mobile = false }: { item: ItemView; mobile?: boolean }) {
  const { t } = useTranslation(['feed', 'common']);
  const { user } = useAuth();
  const category = t(`common:categories.${item.category}`);

  return (
    <article className="flex flex-col gap-4">
      {mobile && <DonorLine donor={item.donor} createdAt={item.created_at} time={formatDateTime(item.created_at)} />}
      <PhotoCarousel
        photos={item.photos}
        title={item.title}
        // No modal do desktop, mais baixa: o texto aparece sem rolar (como no design).
        className={mobile ? 'aspect-[4/3] rounded-xl' : 'aspect-[16/9] max-h-[45vh] rounded-xl'}
      />
      {mobile ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">{category}</Badge>
            <CityLine city={item.city} state={item.state} />
          </div>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {item.title}
          </Typography>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
              {item.title}
            </Typography>
            <Badge tone="accent" className="mt-2">
              {category}
            </Badge>
          </div>
          <DonorLine donor={item.donor} createdAt={item.created_at} size="lg" />
          <CityLine city={item.city} state={item.state} />
        </>
      )}
      {item.description && <Typography className="whitespace-pre-line">{item.description}</Typography>}
      {item.notes && (
        <section className="flex flex-col gap-1">
          <Typography component="h3" sx={{ fontWeight: 700 }}>
            {t('detail.notes')}
          </Typography>
          <Typography className="whitespace-pre-line">{item.notes}</Typography>
        </section>
      )}
      {!user && (
        <Typography variant="body2" color="text.secondary">
          {t('detail.loginForMore')}
        </Typography>
      )}
      <InterestButton item={item} size="lg" confirmLabel={mobile} className="mt-2 w-full max-w-sm self-center" />
    </article>
  );
}

function DetailSkeleton() {
  const { t } = useTranslation('feed');
  return (
    <LoadingRegion label={t('detail.loading')} className="flex flex-col gap-4">
      <Skeleton className="aspect-[4/3] rounded-xl" />
      <Skeleton className="h-8 w-2/3" />
      <div className="flex items-center gap-3">
        <Skeleton circle className="size-12" />
        <Skeleton className="h-5 w-32" />
      </div>
      <SkeletonText lines={4} />
    </LoadingRegion>
  );
}

/** Carregando, não encontrado, erro ou o conteúdo. */
function ItemDetailBody({ id, mobile }: { id: string; mobile?: boolean }) {
  const { t } = useTranslation(['feed', 'common']);
  const query = useItem(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return notFound ? (
      <EmptyState
        illustration="notFound"
        title={t('detail.notFoundTitle')}
        description={t('detail.notFoundDescription')}
        action={<Button to="/feed">{t('detail.back')}</Button>}
      />
    ) : (
      <EmptyState
        illustration="error"
        title={t('common:system.errorTitle')}
        description={query.error.message}
        action={<Button onClick={() => void query.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  }
  return <ItemDetailContent item={query.data} mobile={mobile} />;
}

/** Desktop: modal sobre o feed (o feed continua por trás, com os filtros). */
export function ItemDetailModal({ id, onClose }: { id: string; onClose(): void }) {
  const { t } = useTranslation('common');
  const query = useItem(id);
  return (
    <Modal open onClose={onClose} title={query.data?.title ?? t('pages.item')} hideTitle size="lg">
      <div className="pt-8">
        <ItemDetailBody id={id} />
      </div>
    </Modal>
  );
}

/** Página: no mobile (com voltar, como no design) e no desktop quando o link é aberto direto. */
export function ItemDetailPage({ id, mobile, onBack }: { id: string; mobile: boolean; onBack(): void }) {
  const { t } = useTranslation('feed');
  return (
    <div className={mobile ? 'px-4 py-4' : 'mx-auto max-w-3xl px-6 py-8'}>
      {mobile ? (
        <IconButton label={t('detail.back')} onClick={onBack} className="mb-2">
          <ArrowBackRounded />
        </IconButton>
      ) : (
        <Button variant="ghost" icon={<ArrowBackRounded />} onClick={onBack} className="mb-4">
          {t('detail.back')}
        </Button>
      )}
      <Paper elevation={mobile ? 3 : 1} className="p-5" sx={{ borderRadius: mobile ? 6 : 2 }}>
        <ItemDetailBody id={id} mobile={mobile} />
      </Paper>
    </div>
  );
}
