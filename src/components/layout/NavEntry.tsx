import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useAuth } from '@/core/auth/useAuth';
import { useLoginPrompt } from '@/core/feedback/useLoginPrompt';
import type { NavItem } from './navItems';

export interface NavEntryProps {
  item: NavItem;
  className(state: { isActive: boolean }): string;
  children(state: { isActive: boolean; label: string }): ReactNode;
}

/**
 * Um item de navegação: link normal ou, para visitante em item que exige login,
 * um botão que abre "Entre para continuar" (plano, modo visitante).
 */
export function NavEntry({ item, className, children }: NavEntryProps) {
  const { user } = useAuth();
  const { prompt } = useLoginPrompt();
  const { t } = useTranslation();
  const label = t(item.labelKey);

  if (item.requiresAuth && !user) {
    return (
      <button
        type="button"
        className={className({ isActive: false })}
        onClick={() => prompt(item.to)}
        aria-label={label}
      >
        {children({ isActive: false, label })}
      </button>
    );
  }
  return (
    <NavLink to={item.to} className={className} aria-label={label}>
      {({ isActive }) => children({ isActive, label })}
    </NavLink>
  );
}
