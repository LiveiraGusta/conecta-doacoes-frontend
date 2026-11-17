import { api, ApiError } from '../api/http';
import type { User } from '../types/api';

/** Chave da query da sessão: o estado de "logado" do app inteiro é esta query. */
export const ME_KEY = ['me'] as const;

/** Usuário da sessão (cookie httpOnly) ou `null` para visitante. 401 no boot não é erro. */
export async function fetchMe(): Promise<User | null> {
  try {
    return (await api<{ user: User }>('/auth/me')).user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** Apaga o cookie de sessão no servidor (idempotente). */
export function logout(): Promise<void> {
  return api<void>('/auth/logout', { method: 'POST' });
}
