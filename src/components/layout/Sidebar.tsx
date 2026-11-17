import LoginRounded from '@mui/icons-material/LoginRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuOpenRounded from '@mui/icons-material/MenuOpenRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useLocalStorage } from '@/core/hooks/useLocalStorage';
import { cn } from '@/core/utils/cn';
import { CountBadge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { Logo } from './Logo';
import { NavEntry } from './NavEntry';
import { navItemsFor } from './navItems';
import { useLogoutConfirm } from './useLogoutConfirm';

export const SIDEBAR_STORAGE_KEY = 'cd-sidebar-collapsed';

/**
 * Sidebar do desktop (decisão da fase 1b): 256 px com ícone e texto, ou 72 px só com ícones
 * (o nome vira tooltip e o contador vira um ponto sobre o ícone). A escolha fica no localStorage.
 */
export function Sidebar({ unread = 0 }: { unread?: number }) {
  const [collapsed, setCollapsed] = useLocalStorage(SIDEBAR_STORAGE_KEY, false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ask, dialog } = useLogoutConfirm();
  const items = navItemsFor(user);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-[154px] items-center border-b border-border',
          collapsed ? 'flex-col justify-center gap-2' : 'justify-between px-6',
        )}
      >
        <Logo compact={collapsed} />
        <IconButton
          label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="text-fg-muted"
        >
          {collapsed ? <MenuRounded fontSize="inherit" /> : <MenuOpenRounded fontSize="inherit" />}
        </IconButton>
      </div>

      <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => (
          <NavEntry
            key={item.to}
            item={item}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-4 rounded-xl py-3 text-lg font-semibold text-primary-text transition-colors hover:bg-primary-soft',
                collapsed ? 'justify-center px-0' : 'px-4',
                isActive && 'bg-primary-soft',
              )
            }
          >
            {({ isActive, label }) => (
              <>
                <span className="relative text-3xl" title={collapsed ? label : undefined}>
                  <item.icon fontSize="inherit" aria-hidden />
                  {item.showsUnread && collapsed && (
                    <CountBadge
                      count={unread}
                      label={t('nav.unread', { count: unread })}
                      className="absolute -top-1 -right-2"
                    />
                  )}
                </span>
                {!collapsed && <span className={cn(isActive && 'underline underline-offset-4')}>{label}</span>}
                {!collapsed && item.showsUnread && (
                  <CountBadge count={unread} label={t('nav.unread', { count: unread })} className="ml-auto" />
                )}
              </>
            )}
          </NavEntry>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {user ? (
          <button
            type="button"
            onClick={ask}
            title={collapsed ? t('account.logout') : undefined}
            className={cn(
              'flex w-full items-center gap-4 rounded-xl py-3 font-semibold text-fg-muted hover:bg-surface-alt',
              collapsed ? 'justify-center' : 'px-4',
            )}
          >
            <LogoutRounded fontSize="inherit" aria-hidden className="text-2xl" />
            {!collapsed && t('account.logout')}
            {collapsed && <span className="sr-only">{t('account.logout')}</span>}
          </button>
        ) : (
          <Link
            to="/login"
            title={collapsed ? t('account.login') : undefined}
            className={cn(
              'flex items-center gap-4 rounded-xl py-3 font-semibold text-primary-text hover:bg-primary-soft',
              collapsed ? 'justify-center' : 'px-4',
            )}
          >
            <LoginRounded fontSize="inherit" aria-hidden className="text-2xl" />
            {collapsed ? <span className="sr-only">{t('account.login')}</span> : t('account.login')}
          </Link>
        )}
      </div>
      {dialog}
    </aside>
  );
}
