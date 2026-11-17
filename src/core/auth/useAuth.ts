import { createContext, useContext } from 'react';
import type { Role, User } from '../types/api';

export type AuthStatus = 'loading' | 'visitor' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /**
   * Grava o usuário depois de login/cadastro (a API já gravou o cookie). `redirectTo` é o destino escolhido
   * por quem logou: o PublicOnly usa o mesmo destino, então a ordem entre navegar e gravar não importa.
   */
  setUser(user: User | null, redirectTo?: string): void;
  /** Destino pós-login gravado por `setUser` (null se não houver). */
  afterLogin: string | null;
  /** Esquece o destino pós-login (chamado quando a navegação chega lá). */
  clearAfterLogin(): void;
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
