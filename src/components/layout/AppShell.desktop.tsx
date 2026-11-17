import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { Skeleton } from '../ui/Skeleton';
import { AccountMenu } from './AccountMenu';
import { NgoStatusBanner, OfflineBanner } from './Banners';
import { Sidebar } from './Sidebar';

/**
 * Desktop (imagem design-desktop-feed): sidebar recolhível + header azul alto com título,
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
        <header className="flex min-h-[154px] items-center gap-6 bg-primary px-10 py-6 text-on-primary">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="truncate text-3xl font-medium">{title}</h1>
            <div id="header-slot" />
          </div>
          <div className="flex shrink-0 items-center gap-6">
            {status === 'loading' ? (
              <Skeleton className="size-14 rounded-full bg-white/20" />
            ) : user ? (
              <div className="flex flex-col items-end gap-2">
                <AccountMenu user={user} showName />
                {user.role !== 'ADMIN' && (
                  <p className="flex items-center gap-1 text-sm">
                    <LocationOnRounded fontSize="inherit" aria-hidden />
                    <span className="font-semibold">{t('header.location')}</span>
                    <span>
                      {user.city} - {user.state}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/register" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white/10">
                  {t('account.register')}
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center rounded-full bg-white/95 px-5 text-sm font-semibold text-primary-700 hover:bg-white"
                >
                  {t('account.login')}
                </Link>
              </div>
            )}
          </div>
        </header>
        <NgoStatusBanner />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
