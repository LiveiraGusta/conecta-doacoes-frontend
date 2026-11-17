import LoginRounded from '@mui/icons-material/LoginRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuOpenRounded from '@mui/icons-material/MenuOpenRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useUnreadCount } from '@/core/hooks/useChats';
import { useLocalStorage } from '@/core/hooks/useLocalStorage';
import { cn } from '@/core/utils/cn';
import { CountBadge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { Logo } from './Logo';
import { useNavItem } from './NavEntry';
import { navItemsFor, type NavItem } from './navItems';
import { useLogoutConfirm } from './useLogoutConfirm';

export const SIDEBAR_STORAGE_KEY = 'cd-sidebar-collapsed';
const WIDTH = { open: 256, closed: 72 };

const itemSx = (collapsed: boolean) => ({
  borderRadius: 3,
  py: 1.25,
  justifyContent: collapsed ? 'center' : 'flex-start',
  color: 'primary.main',
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'action.selected' },
});

function SidebarItem({ item, collapsed, unread }: { item: NavItem; collapsed: boolean; unread: number }) {
  const { t } = useTranslation();
  const { label, active, actionProps } = useNavItem(item);
  const icon = (
    <Badge badgeContent={collapsed && item.showsUnread ? unread : 0} color="error" max={99}>
      <item.icon fontSize="inherit" aria-hidden />
    </Badge>
  );
  return (
    <Tooltip title={collapsed ? label : ''} placement="right">
      <ListItemButton selected={active} sx={itemSx(collapsed)} {...(actionProps as object)}>
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 48, color: 'inherit', fontSize: 30 }}>{icon}</ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={label}
            slotProps={{
              primary: {
                sx: {
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  textDecoration: active ? 'underline' : 'none',
                  textUnderlineOffset: 4,
                },
              },
            }}
          />
        )}
        {!collapsed && item.showsUnread && <CountBadge count={unread} label={t('nav.unread', { count: unread })} />}
      </ListItemButton>
    </Tooltip>
  );
}

/**
 * Sidebar do desktop (Drawer permanente do MUI): 256 px com ícone e texto, ou 72 px só com ícones
 * (o nome vira tooltip e o contador vai para cima do ícone). A escolha fica no localStorage.
 */
export function Sidebar() {
  const unread = useUnreadCount();
  const [collapsed, setCollapsed] = useLocalStorage(SIDEBAR_STORAGE_KEY, false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ask, dialog } = useLogoutConfirm();
  const width = collapsed ? WIDTH.closed : WIDTH.open;

  return (
    <Drawer
      variant="permanent"
      data-collapsed={collapsed}
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 200ms',
        '& .MuiDrawer-paper': {
          width,
          transition: 'width 200ms',
          overflowX: 'hidden',
          position: 'sticky',
          height: '100dvh',
        },
      }}
    >
      <div
        className={cn(
          'flex h-[154px] items-center',
          collapsed ? 'flex-col justify-center gap-2' : 'justify-between px-6',
        )}
      >
        <Logo compact={collapsed} />
        <IconButton
          label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <MenuRounded /> : <MenuOpenRounded />}
        </IconButton>
      </div>
      <Divider />

      <nav aria-label={t('nav.main')} className="flex-1">
        <List sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {navItemsFor(user).map((item) => (
            <SidebarItem key={item.to} item={item} collapsed={collapsed} unread={unread} />
          ))}
        </List>
      </nav>

      <Divider />
      <List sx={{ px: 1.5 }}>
        {user ? (
          <Tooltip title={collapsed ? t('account.logout') : ''} placement="right">
            <ListItemButton
              onClick={ask}
              sx={{ ...itemSx(collapsed), color: 'text.secondary' }}
              aria-label={t('account.logout')}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 48, color: 'inherit' }}>
                <LogoutRounded />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText primary={t('account.logout')} slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
              )}
            </ListItemButton>
          </Tooltip>
        ) : (
          <Tooltip title={collapsed ? t('account.login') : ''} placement="right">
            <ListItemButton component={Link} to="/login" sx={itemSx(collapsed)} aria-label={t('account.login')}>
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 48, color: 'inherit' }}>
                <LoginRounded />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText primary={t('account.login')} slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
              )}
            </ListItemButton>
          </Tooltip>
        )}
      </List>
      {dialog}
    </Drawer>
  );
}
