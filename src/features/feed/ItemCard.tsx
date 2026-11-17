import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import type { FeedCardItem } from '@/core/hooks/useFeed';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { formatDateTime } from '@/core/utils/format';
import { InterestButton } from './InterestButton';
import { useItemLink, type ItemLink } from './itemLink';
import { CityLine, DonorLine } from './itemParts';
import { PhotoCarousel } from './PhotoCarousel';

export interface ItemCardProps {
  item: FeedCardItem;
}

function useCard(item: FeedCardItem) {
  const { t } = useTranslation(['feed', 'common']);
  const link = useItemLink()(item.id);
  const navigate = useNavigate();
  return {
    t,
    link,
    open: () => navigate(link.to, { state: link.state }),
    category: t(`common:categories.${item.category}`),
  };
}

function TitleLink({ item, link }: { item: FeedCardItem; link: ItemLink }) {
  const { t } = useTranslation('feed');
  return (
    <Link
      component={RouterLink}
      to={link.to}
      state={link.state}
      underline="hover"
      color="inherit"
      aria-label={t('card.open', { title: item.title })}
    >
      {item.title}
    </Link>
  );
}

/** Desktop (design-desktop-feed): foto em cima, título + categoria, doador, cidade, descrição e botão. */
export function ItemCardDesktop({ item }: ItemCardProps) {
  const { link, open, category } = useCard(item);
  return (
    <Card component="article" elevation={2} className="flex h-full flex-col" sx={{ borderRadius: 1 }}>
      <PhotoCarousel photos={item.photos} title={item.title} onOpen={open} className="aspect-[4/3]" />
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            <TitleLink item={item} link={link} />
          </Typography>
          <Badge tone="accent">{category}</Badge>
        </div>
        <DonorLine donor={item.donor} createdAt={item.created_at} />
        <CityLine city={item.city} state={item.state} />
        {item.description && (
          <Typography variant="body2" className="line-clamp-3">
            {item.description}
          </Typography>
        )}
      </CardContent>
      <CardActions className="justify-center pb-5">
        <InterestButton item={item} size="sm" className="min-w-44" />
      </CardActions>
    </Card>
  );
}

/** Mobile (design-mobile-feed): doador + data no topo, foto, categoria + cidade, título, descrição e botão. */
export function ItemCardMobile({ item }: ItemCardProps) {
  const { link, open, category } = useCard(item);
  return (
    <Card component="article" elevation={3} className="flex flex-col gap-3 p-4" sx={{ borderRadius: 6 }}>
      <DonorLine donor={item.donor} createdAt={item.created_at} time={formatDateTime(item.created_at)} />
      <PhotoCarousel photos={item.photos} title={item.title} onOpen={open} className="aspect-[4/3] rounded-xl" />
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{category}</Badge>
        <CityLine city={item.city} state={item.state} />
      </div>
      <Typography component="h3" sx={{ fontWeight: 700 }}>
        <TitleLink item={item} link={link} />
      </Typography>
      {item.description && (
        <Typography variant="body2" className="line-clamp-4">
          {item.description}
        </Typography>
      )}
      <InterestButton item={item} className="self-center" />
    </Card>
  );
}

export function ItemCard(props: ItemCardProps) {
  return useIsMobile() ? <ItemCardMobile {...props} /> : <ItemCardDesktop {...props} />;
}

/** Card carregando, com o mesmo tamanho do final. */
export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded bg-surface shadow-sm">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton circle className="size-8" />
          <Skeleton className="h-4 w-24" />
        </div>
        <SkeletonText lines={2} />
        <Skeleton className="mx-auto mt-2 h-8 w-44 rounded-full" />
      </div>
    </div>
  );
}
