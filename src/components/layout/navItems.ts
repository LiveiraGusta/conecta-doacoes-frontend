import FlagRounded from '@mui/icons-material/FlagRounded';
import ForumRounded from '@mui/icons-material/ForumRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import type { ComponentType } from 'react';
import type { User } from '@/core/types/api';

export interface NavItem {
  to: string;
  /** Chave em common.json → nav.* */
  labelKey: 'nav.feed' | 'nav.chats' | 'nav.donations' | 'nav.profile' | 'nav.ngos' | 'nav.reports' | 'nav.settings';
  icon: ComponentType<{ fontSize?: 'inherit'; className?: string; 'aria-hidden'?: boolean }>;
  /** Visitante que clica abre "Entre para continuar" em vez de navegar. */
  requiresAuth?: boolean;
  /** Mostra o contador de não lidas (fase 5). */
  showsUnread?: boolean;
}

/** Os 4 itens do design (Feed, Conversas, Doações, Perfil) para doador, ONG e visitante; o Admin tem os seus. */
export function navItemsFor(user: User | null): NavItem[] {
  if (user?.role === 'ADMIN') {
    return [
      { to: '/admin/ngos', labelKey: 'nav.ngos', icon: VerifiedUserRounded },
      { to: '/admin/reports', labelKey: 'nav.reports', icon: FlagRounded },
      { to: '/settings', labelKey: 'nav.settings', icon: SettingsRounded },
    ];
  }
  return [
    { to: '/feed', labelKey: 'nav.feed', icon: HomeRounded },
    { to: '/chats', labelKey: 'nav.chats', icon: ForumRounded, requiresAuth: true, showsUnread: true },
    { to: '/donations', labelKey: 'nav.donations', icon: Inventory2Rounded, requiresAuth: true },
    { to: '/profile', labelKey: 'nav.profile', icon: PersonRounded, requiresAuth: true },
  ];
}
