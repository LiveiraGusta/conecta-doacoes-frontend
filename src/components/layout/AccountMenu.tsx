import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import { useTranslation } from 'react-i18next';
import type { User } from '@/core/types/api';
import { cn } from '@/core/utils/cn';
import { Avatar } from '../ui/Avatar';
import { Menu, type MenuItem } from '../ui/Menu';
import { useLogoutConfirm } from './useLogoutConfirm';

/** Menu do avatar: Minha página, Editar perfil, Configurações e Sair (com confirmação). */
export function AccountMenu({
  user,
  showName = false,
  tone = 'onPrimary',
}: {
  user: User;
  showName?: boolean;
  tone?: 'onPrimary' | 'onSurface';
}) {
  const { t } = useTranslation();
  const { ask, dialog } = useLogoutConfirm();

  const items: MenuItem[] = [
    ...(user.role !== 'ADMIN'
      ? ([
          {
            kind: 'link',
            label: t('account.myPage'),
            to: `/u/${user.id}`,
            icon: <AccountCircleRounded fontSize="inherit" />,
          },
          { kind: 'link', label: t('account.editProfile'), to: '/profile', icon: <PersonRounded fontSize="inherit" /> },
        ] satisfies MenuItem[])
      : []),
    { kind: 'link', label: t('nav.settings'), to: '/settings', icon: <SettingsRounded fontSize="inherit" /> },
    {
      kind: 'action',
      label: t('account.logout'),
      onSelect: ask,
      danger: true,
      icon: <LogoutRounded fontSize="inherit" />,
    },
  ];

  return (
    <>
      <Menu
        label={t('account.menu', { name: user.name })}
        items={items}
        triggerClassName={cn(
          'flex items-center gap-3 rounded-full p-1 pr-2 transition-colors',
          tone === 'onPrimary' ? 'hover:bg-white/10' : 'hover:bg-surface-alt',
        )}
        trigger={
          <>
            {showName && <span className="max-w-48 truncate text-lg font-medium uppercase">{user.name}</span>}
            <Avatar
              name={user.name}
              seed={user.id}
              src={user.avatar_url}
              size={showName ? 'lg' : 'md'}
              className="ring-2 ring-white/70"
            />
            {showName && <KeyboardArrowDownRounded fontSize="inherit" aria-hidden className="text-xl" />}
          </>
        }
      />
      {dialog}
    </>
  );
}
