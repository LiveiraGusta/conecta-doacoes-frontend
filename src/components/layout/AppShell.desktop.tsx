import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { AccountMenu } from './AccountMenu';
import { NgoStatusBanner, OfflineBanner } from './Banners';
import { Sidebar } from './Sidebar';

/**
 * Desktop (imagem design-desktop-feed): sidebar recolhível + AppBar azul alta com título,
 * espaço para a busca (fase 3), localização e nome + avatar com o menu da conta.
 */
export function AppShellDesktop() {
  const title = usePageTitle();
  const { user, status } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <AppBar position="static" elevation={0} color="primary">
          <Toolbar className="min-h-[154px] gap-6 px-10 py-6">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <Typography variant="h4" component="h1" noWrap sx={{ fontWeight: 500 }}>
                {title}
              </Typography>
              <div id="header-slot" />
            </div>
            <div className="flex shrink-0 items-center gap-6">
              {status === 'loading' ? (
                <Skeleton circle className="size-14 bg-white/20" />
              ) : user ? (
                <div className="flex flex-col items-end gap-2">
                  <AccountMenu user={user} showName />
                  {user.role !== 'ADMIN' && (
                    <Typography variant="body2" className="flex items-center gap-1">
                      <LocationOnRounded fontSize="inherit" aria-hidden />
                      <strong>{t('header.location')}</strong>
                      <span>
                        {user.city} - {user.state}
                      </span>
                    </Typography>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button to="/register" variant="ghost" sx={{ color: 'common.white' }}>
                    {t('account.register')}
                  </Button>
                  <Button to="/login" variant="inverse">
                    {t('account.login')}
                  </Button>
                </div>
              )}
            </div>
          </Toolbar>
        </AppBar>
        <NgoStatusBanner />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
