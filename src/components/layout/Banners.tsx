import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import WifiOffRounded from '@mui/icons-material/WifiOffRounded';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useOnlineStatus } from '@/core/hooks/useOnlineStatus';

/** Faixa fixa "Você está offline" (não bloqueia a tela). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-white dark:text-bg"
    >
      <WifiOffRounded fontSize="inherit" aria-hidden className="text-base" />
      {t('offline.banner')}
    </div>
  );
}

/**
 * ONG pendente: "cadastro em análise" (o feed funciona, sem o botão de interesse).
 * ONG rejeitada: o motivo e o link para reenviar o documento (guia, F4).
 */
export function NgoStatusBanner() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const status = user?.ngo_profile?.status;
  if (user?.role !== 'NGO' || !status || status === 'ATIVO') return null;

  if (status === 'PENDENTE_APROVACAO') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-b border-warning/30 bg-warning/10 px-4 py-3 text-sm text-fg"
      >
        <HourglassTopRounded fontSize="inherit" aria-hidden className="mt-0.5 text-lg text-warning" />
        <p>
          <strong>{t('ngoBanner.pendingTitle')}</strong> {t('ngoBanner.pendingDescription')}
        </p>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-danger/30 bg-danger/10 px-4 py-3 text-sm text-fg"
    >
      <InfoRounded fontSize="inherit" aria-hidden className="mt-0.5 text-lg text-danger" />
      <p className="flex-1">
        <strong>{t('ngoBanner.rejectedTitle')}</strong> {user.ngo_profile?.rejection_reason}{' '}
        <Link to="/profile" className="font-semibold text-primary-text underline">
          {t('ngoBanner.resubmit')}
        </Link>
      </p>
    </div>
  );
}
