import ChatRounded from '@mui/icons-material/ChatRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/core/auth/useAuth';
import { useLoginPrompt } from '@/core/feedback/useLoginPrompt';
import { useInterest } from '@/core/hooks/useInterest';
import { interestView, type InterestItem } from './interestView';

/**
 * Ação principal do card e do detalhe:
 * visitante → "Entre para continuar"; ONG ativa → "Tenho interesse" / "Desfazer interesse" (otimista);
 * item em negociação → selo; ONG escolhida → selo + atalho para a conversa.
 */
export function InterestButton({
  item,
  size = 'md',
  confirmLabel = false,
  className,
}: {
  item: InterestItem;
  size?: 'sm' | 'md' | 'lg';
  /** Texto do detalhe mobile ("Confirmar interesse"). */
  confirmLabel?: boolean;
  className?: string;
}) {
  const { t } = useTranslation('feed');
  const { user } = useAuth();
  const loginPrompt = useLoginPrompt();
  const interest = useInterest();
  const view = interestView(item, user);

  switch (view) {
    case 'none':
      return null;
    case 'inProgress':
      return (
        <div className={className}>
          <Chip icon={<HourglassTopRounded />} label={t('status.inProgress')} color="warning" variant="outlined" />
        </div>
      );
    case 'donated':
      return (
        <div className={className}>
          <Chip icon={<CheckCircleRounded />} label={t('status.donated')} variant="outlined" />
        </div>
      );
    case 'selected':
    case 'received':
      return (
        <div className={`flex flex-wrap items-center justify-center gap-2 ${className ?? ''}`}>
          <Chip
            icon={<VerifiedRounded />}
            label={t(view === 'received' ? 'status.received' : 'status.selected')}
            color="success"
          />
          <Button to={`/chats/${item.id}`} size={size} variant="secondary" icon={<ChatRounded />}>
            {t('status.openChat')}
          </Button>
        </div>
      );
    case 'login':
      return (
        <Button
          size={size}
          className={className}
          icon={<FavoriteBorderRounded />}
          onClick={() => loginPrompt.prompt(`/items/${item.id}`)}
        >
          {confirmLabel ? t('interest.addMobile') : t('interest.add')}
        </Button>
      );
    case 'add':
    case 'remove': {
      const adding = view === 'add';
      return (
        <Button
          size={size}
          className={className}
          variant={adding ? 'primary' : 'secondary'}
          icon={adding ? <FavoriteBorderRounded /> : <FavoriteRounded />}
          loading={interest.isPending}
          onClick={() => interest.mutate({ id: item.id, interested: adding })}
        >
          {adding ? (confirmLabel ? t('interest.addMobile') : t('interest.add')) : t('interest.remove')}
        </Button>
      );
    }
  }
}
