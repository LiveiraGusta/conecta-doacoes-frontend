import { createContext, useContext } from 'react';
import type { Role, User } from '../types/api';

export type AuthStatus = 'loading' | 'visitor' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Grava o usuário depois de login/cadastro (a API já gravou o cookie). */
  setUser(user: User | null): void;
  /** Sai: apaga o cookie, limpa o cache e volta para o feed como visitante. */
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

/** Página inicial de cada perfil (depois do login, no logo e no 403). */
export function homeFor(role: Role | undefined): string {
  return role === 'ADMIN' ? '/admin/ngos' : '/feed';
}
