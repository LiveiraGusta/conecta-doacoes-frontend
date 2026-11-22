import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import AppBar from '@mui/material/AppBar';
import ButtonBase from '@mui/material/ButtonBase';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/useAuth';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { AccountMenu } from './AccountMenu';
import { NgoStatusBanner, OfflineBanner } from './Banners';
import { LazyLocationModal } from './LazyLocationModal';
import { ShellContent } from './ShellContent';
import { Sidebar } from './Sidebar';

/**
 * Desktop (imagem design-desktop-feed): sidebar recolhível + AppBar azul alta com título,
 * espaço para a busca da página, localização (clique troca a cidade) e nome + avatar com o menu da conta.
 */
export function AppShellDesktop({
  content,
  headerSlotRef,
}: {
  /** `div` da página (ver AppShell). */
  content: HTMLElement;
  /** Recebe o espaço do header onde a página pode pôr a busca. */
  headerSlotRef(el: HTMLElement | null): void;
}) {
  const title = usePageTitle();
  const { user, status } = useAuth();
  const { t } = useTranslation(['common', 'feed']);
  const [locationOpen, setLocationOpen] = useState(false);

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
              <div ref={headerSlotRef} className="max-w-2xl empty:hidden" />
            </div>
            <div className="flex shrink-0 items-center gap-6">
              {status === 'loading' ? (
                <Skeleton circle className="size-14 bg-white/20" />
              ) : user ? (
                <div className="flex flex-col items-end gap-2">
                  <AccountMenu user={user} showName />
                  {user.role !== 'ADMIN' && (
                    <ButtonBase
                      onClick={() => setLocationOpen(true)}
                      aria-label={`${t('feed:location.change')}: ${user.city} - ${user.state}`}
                      className="flex flex-col items-start rounded-lg px-2 py-1 text-left hover:bg-white/10"
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        className="flex items-center gap-1"
                        sx={{ fontWeight: 700 }}
                      >
                        <LocationOnRounded fontSize="inherit" aria-hidden />
                        {t('header.location')}
                      </Typography>
                      <Typography variant="body2" component="span" className="flex items-center gap-1">
                        {user.city} - {user.state}
                        <ExpandMoreRounded fontSize="small" aria-hidden />
                      </Typography>
                    </ButtonBase>
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
        <ShellContent content={content} className="flex-1" />
      </div>
      {user && <LazyLocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />}
    </div>
  );
}
