import { useTranslation } from 'react-i18next';
import { Link, useMatch } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useLoginPrompt } from '@/core/feedback/useLoginPrompt';
import type { NavItem } from './navItems';

/**
 * Comportamento de um item de navegação, para espalhar num componente do MUI (ListItemButton,
 * BottomNavigationAction): link do router, ou, para visitante em item que exige login, um botão
 * que abre "Entre para continuar" (plano, modo visitante).
 */
export function useNavItem(item: NavItem) {
  const { user } = useAuth();
  const { prompt } = useLoginPrompt();
  const { t } = useTranslation();
  const label = t(item.labelKey);
  const active = Boolean(useMatch({ path: item.to, end: false }));
  const locked = Boolean(item.requiresAuth && !user);

  const actionProps = locked
    ? { onClick: () => prompt(item.to), 'aria-label': label }
    : { component: Link, to: item.to, 'aria-label': label, 'aria-current': active ? ('page' as const) : undefined };

  return { label, active: active && !locked, actionProps };
}
