import LoginRounded from '@mui/icons-material/LoginRounded';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import MuiIconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useUnreadCount } from '@/core/hooks/useChats';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { Skeleton } from '../ui/Skeleton';
import { AccountMenu } from './AccountMenu';
import { NgoStatusBanner, OfflineBanner } from './Banners';
import { useNavItem } from './NavEntry';
import { navItemsFor, type NavItem } from './navItems';
import { ShellContent } from './ShellContent';

function BottomItem({ item, unread, ...rest }: { item: NavItem; unread: number; value: string }) {
  const { label, active, actionProps } = useNavItem(item);
  const { t } = useTranslation();
  return (
    <BottomNavigationAction
      {...rest}
      {...(actionProps as object)}
      showLabel={false}
      label={label}
      className={active ? 'Mui-selected' : undefined}
      icon={
        <Badge
          badgeContent={item.showsUnread ? unread : 0}
          color="error"
          max={99}
          slotProps={{ badge: { 'aria-label': t('nav.unread', { count: unread }) } as object }}
        >
          <item.icon fontSize="inherit" aria-hidden />
        </Badge>
      }
      sx={{ fontSize: 32, minWidth: 0, color: active ? 'primary.main' : 'text.primary' }}
    />
  );
}

/**
 * Mobile (imagem design-mobile-feed): AppBar clara compacta (título + avatar) e BottomNavigation fixa
 * com os 4 ícones. O conteúdo ganha espaço embaixo para a barra não cobrir nada.
 */
export function AppShellMobile({ content }: { content: HTMLElement }) {
  const unread = useUnreadCount();
  const title = usePageTitle();
  const { user, status } = useAuth();
  const { t } = useTranslation();
  const items = navItemsFor(user);

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <AppBar position="sticky" color="inherit" elevation={2} className="rounded-b-3xl">
        <Toolbar className="h-[72px] gap-3">
          <span className="size-10" aria-hidden />
          <Typography variant="h6" component="h1" noWrap className="flex-1 text-center uppercase">
            {title}
          </Typography>
          {status === 'loading' ? (
            <Skeleton circle className="size-10" />
          ) : user ? (
            <AccountMenu user={user} tone="onSurface" />
          ) : (
            <Tooltip title={t('account.login')}>
              <MuiIconButton aria-label={t('account.login')} component={Link} to="/login" color="primary">
                <LoginRounded />
              </MuiIconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <NgoStatusBanner />
      <ShellContent content={content} className="flex-1 pb-24" />
      <Paper elevation={6} className="fixed inset-x-0 bottom-0 z-20 overflow-hidden rounded-t-3xl">
        <nav aria-label={t('nav.main')}>
          <BottomNavigation showLabels={false} className="h-[72px]">
            {items.map((item) => (
              <BottomItem key={item.to} value={item.to} item={item} unread={unread} />
            ))}
          </BottomNavigation>
        </nav>
      </Paper>
    </div>
  );
}
