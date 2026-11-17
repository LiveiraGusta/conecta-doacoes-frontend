import ChatRounded from '@mui/icons-material/ChatRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import ImageNotSupportedRounded from '@mui/icons-material/ImageNotSupportedRounded';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import type { FeedCardItem } from '@/core/hooks/useFeed';
import type { ItemStatus } from '@/core/types/api';
import { relativeTime } from '@/core/utils/format';
import { InterestButton } from '@/features/feed/InterestButton';
import { CityLine, DonorLine } from '@/features/feed/itemParts';

const STATUS_TONE: Record<ItemStatus, BadgeTone> = {
  DISPONIVEL: 'success',
  EM_PROGRESSO: 'warning',
  DOADO: 'neutral',
};

/** Ação do doador em cada status: ver interessadas enquanto está disponível; depois, a conversa. */
function DonorActions({ item }: { item: FeedCardItem }) {
  const { t } = useTranslation('donations');
  if (item.status === 'DISPONIVEL') {
    const count = item.interests_count ?? 0;
    return (
      <Button
        to={`/donations/${item.id}/interests`}
        variant={count > 0 ? 'primary' : 'secondary'}
        size="sm"
        icon={<GroupsRounded />}
      >
        {t('mine.interests', { count })}
      </Button>
    );
  }
  return (
    <Button to={`/chats/${item.id}`} variant="secondary" size="sm" icon={<ChatRounded />}>
      {t('mine.openChat')}
    </Button>
  );
}

/**
 * Linha de "Minhas doações" (doador) e "Meus interesses" (ONG): capa, título, status, categoria e a ação
 * do momento. Uma peça só, responsiva (foto em cima no celular, ao lado no desktop).
 */
export function MyItemCard({ item, role }: { item: FeedCardItem; role: 'DONOR' | 'NGO' }) {
  const { t } = useTranslation(['donations', 'common', 'feed']);
  const cover = item.photos[0];
  return (
    <Card component="article" variant="outlined" className="flex flex-col sm:flex-row" sx={{ borderRadius: 3 }}>
      <RouterLink to={`/items/${item.id}`} tabIndex={-1} aria-hidden className="block shrink-0 sm:w-52">
        {cover ? (
          <img src={cover} alt="" className="aspect-[4/3] size-full object-cover" loading="lazy" />
        ) : (
          <span className="flex aspect-[4/3] items-center justify-center bg-surface-alt text-fg-muted">
            <ImageNotSupportedRounded />
          </span>
        )}
      </RouterLink>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[item.status]}>{t(`mine.badge.${item.status}`)}</Badge>
          <Badge tone="accent">{t(`common:categories.${item.category}`)}</Badge>
        </div>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          <Link
            component={RouterLink}
            to={`/items/${item.id}`}
            underline="hover"
            color="inherit"
            aria-label={t('feed:card.open', { title: item.title })}
          >
            {item.title}
          </Link>
        </Typography>
        {role === 'NGO' ? (
          <DonorLine donor={item.donor} createdAt={item.created_at} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            <time dateTime={item.created_at}>{t('mine.publishedAgo', { time: relativeTime(item.created_at) })}</time>
          </Typography>
        )}
        <CityLine city={item.city} state={item.state} />
        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
          {role === 'DONOR' ? <DonorActions item={item} /> : <InterestButton item={item} size="sm" />}
        </div>
      </div>
    </Card>
  );
}

export function MyItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface sm:flex-row">
      <Skeleton className="aspect-[4/3] rounded-none sm:w-52" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-2/3" />
        <SkeletonText lines={2} />
        <Skeleton className="ml-auto h-8 w-48 rounded-full" />
      </div>
    </div>
  );
}
