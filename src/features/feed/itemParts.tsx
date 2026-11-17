import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Avatar, type AvatarSize } from '@/components/ui/Avatar';
import type { FeedCardItem } from '@/core/hooks/useFeed';
import { relativeTime } from '@/core/utils/format';

/**
 * Doador + quando publicou (como no design). Visitante não vê nome nem foto (decisão da 0.2b-3): "Doador".
 * O nome leva à página pessoal.
 */
export function DonorLine({
  donor,
  createdAt,
  size = 'sm',
  time,
}: {
  donor: FeedCardItem['donor'];
  createdAt: string;
  size?: AvatarSize;
  /** Texto da data; padrão: relativo ("há 2 h"). */
  time?: string;
}) {
  const { t } = useTranslation('feed');
  const big = size !== 'sm';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={donor?.name} seed={donor?.id} src={donor?.avatar_url} size={size} />
      <div className="flex min-w-0 flex-col">
        {donor ? (
          <Link
            component={RouterLink}
            to={`/u/${donor.id}`}
            underline="hover"
            color="inherit"
            noWrap
            sx={{ fontWeight: 700, fontSize: big ? '1.1rem' : '0.875rem' }}
          >
            {donor.name}
          </Link>
        ) : (
          <Typography noWrap sx={{ fontWeight: 700, fontSize: big ? '1.1rem' : '0.875rem' }}>
            {t('card.donorFallback')}
          </Typography>
        )}
        <Typography
          component="time"
          dateTime={createdAt}
          color="text.secondary"
          sx={{ fontSize: big ? '1rem' : '0.75rem' }}
        >
          {time ?? relativeTime(createdAt)}
        </Typography>
      </div>
    </div>
  );
}

export function CityLine({ city, state, className }: { city: string; state: string; className?: string }) {
  return (
    <Typography variant="body2" color="text.secondary" className={`flex items-center gap-1 ${className ?? ''}`}>
      <LocationOnOutlined fontSize="inherit" aria-hidden />
      {city} - {state}
    </Typography>
  );
}
