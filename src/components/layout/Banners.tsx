import WifiOffRounded from '@mui/icons-material/WifiOffRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useOnlineStatus } from '@/core/hooks/useOnlineStatus';

/** Faixa "Você está offline" (Alert do MUI; não bloqueia a tela). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <Alert
      role="status"
      severity="warning"
      variant="filled"
      square
      icon={<WifiOffRounded />}
      sx={{ justifyContent: 'center', borderRadius: 0 }}
    >
      {t('offline.banner')}
    </Alert>
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
      <Alert role="status" severity="warning" sx={{ borderRadius: 0 }}>
        <strong>{t('ngoBanner.pendingTitle')}</strong> {t('ngoBanner.pendingDescription')}
      </Alert>
    );
  }
  return (
    <Alert severity="error" sx={{ borderRadius: 0 }}>
      <AlertTitle>{t('ngoBanner.rejectedTitle')}</AlertTitle>
      {user.ngo_profile?.rejection_reason}{' '}
      <Link component={RouterLink} to="/profile" sx={{ fontWeight: 600 }}>
        {t('ngoBanner.resubmit')}
      </Link>
    </Alert>
  );
}
