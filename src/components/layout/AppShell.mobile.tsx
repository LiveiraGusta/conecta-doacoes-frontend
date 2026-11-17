import LoginRounded from '@mui/icons-material/LoginRounded';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { cn } from '@/core/utils/cn';
import { CountBadge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { AccountMenu } from './AccountMenu';
import { NgoStatusBanner, OfflineBanner } from './Banners';
import { NavEntry } from './NavEntry';
import { navItemsFor } from './navItems';

/**
 * Mobile (imagem design-mobile-feed): header branco compacto (título + avatar) e BottomNav fixa
 * com os 4 ícones. O conteúdo ganha espaço embaixo para a barra não cobrir nada.
 */
export function AppShellMobile({ unread = 0 }: { unread?: number }) {
  const title = usePageTitle();
  const { user, status } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 rounded-b-3xl bg-surface px-5 shadow-md">
        <span className="size-10" aria-hidden />
        <h1 className="flex-1 truncate text-center text-xl font-medium uppercase">{title}</h1>
        {status === 'loading' ? (
          <Skeleton className="size-10 rounded-full" />
        ) : user ? (
          <AccountMenu user={user} tone="onSurface" />
        ) : (
          <Link
            to="/login"
            aria-label={t('account.login')}
            className="flex size-10 items-center justify-center rounded-full text-2xl text-primary-text hover:bg-primary-soft"
          >
            <LoginRounded fontSize="inherit" aria-hidden />
          </Link>
        )}
      </header>
      <NgoStatusBanner />
      <main id="conteudo" className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-20 flex h-[72px] items-center justify-around rounded-t-3xl bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      >
        {navItemsFor(user).map((item) => (
          <NavEntry
            key={item.to}
            item={item}
            className={({ isActive }) =>
              cn(
                'relative flex size-14 items-center justify-center rounded-2xl text-[32px] transition-colors',
                isActive ? 'text-primary-500' : 'text-fg',
              )
            }
          >
            {() => (
              <>
                <item.icon fontSize="inherit" aria-hidden />
                {item.showsUnread && (
                  <CountBadge
                    count={unread}
                    label={t('nav.unread', { count: unread })}
                    className="absolute top-1 right-1"
                  />
                )}
              </>
            )}
          </NavEntry>
        ))}
      </nav>
    </div>
  );
}
