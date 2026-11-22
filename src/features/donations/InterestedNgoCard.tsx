import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { InterestedNgo } from '@/core/types/api';
import { relativeTime } from '@/core/utils/format';
import { CityLine } from '@/features/feed/itemParts';

export interface InterestedNgoCardProps {
  ngo: InterestedNgo;
  /** Item ainda DISPONIVEL: dá para escolher. */
  canChoose: boolean;
  /** Esta é a ONG escolhida (item em negociação ou doado). */
  chosen: boolean;
  onChoose(): void;
}

/** Uma ONG interessada (guia, F8): nome (leva à página dela), cidade, CNPJ, site, quando curtiu e "Escolher". */
export function InterestedNgoCard({ ngo, canChoose, chosen, onChoose }: InterestedNgoCardProps) {
  const { t } = useTranslation('donations');
  const active = ngo.ngo_status === 'ATIVO';
  return (
    <Card
      component="li"
      variant="outlined"
      className="flex animate-fade-up list-none flex-col gap-3 p-4 sm:flex-row sm:items-center"
      sx={{ borderRadius: 3, ...(chosen && { borderColor: 'success.main', borderWidth: 2 }) }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={ngo.name} seed={ngo.ngo_id} src={ngo.avatar_url} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            component={RouterLink}
            to={`/u/${ngo.ngo_id}`}
            underline="hover"
            color="inherit"
            sx={{ fontWeight: 700, fontSize: '1.05rem' }}
          >
            {ngo.name}
          </Link>
          <CityLine city={ngo.city} state={ngo.state} />
          <Typography variant="caption" color="text.secondary">
            {t('interests.cnpj', { cnpj: ngo.cnpj })} ·{' '}
            <time dateTime={ngo.liked_at}>{t('interests.likedAgo', { time: relativeTime(ngo.liked_at) })}</time>
          </Typography>
          {ngo.website && (
            <Link
              href={ngo.website}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              className="flex items-center gap-1 self-start"
            >
              <LanguageRounded fontSize="inherit" aria-hidden />
              {t('interests.site')}
            </Link>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
        {chosen ? (
          <Chip icon={<CheckCircleRounded />} label={t('interests.chosen')} color="success" />
        ) : !active ? (
          <>
            <Chip label={t('interests.notActive')} variant="outlined" />
            <Typography variant="caption" color="text.secondary" className="max-w-56 sm:text-right">
              {t('interests.notActiveHint')}
            </Typography>
          </>
        ) : (
          canChoose && (
            <Button onClick={onChoose} aria-label={`${t('interests.choose')} ${ngo.name}`}>
              {t('interests.choose')}
            </Button>
          )
        )}
      </div>
    </Card>
  );
}

export function InterestedNgoCardSkeleton() {
  return (
    <li className="flex list-none items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <Skeleton circle className="size-12" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </li>
  );
}
