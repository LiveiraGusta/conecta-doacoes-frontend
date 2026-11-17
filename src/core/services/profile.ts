import { api } from '../api/http';
import type { User } from '../types/api';

export interface ProfilePatch {
  name?: string;
  city?: string;
  state?: string;
  bio?: string | null;
}

/** PATCH /profile (guia, F12). Cidade e UF vão sempre juntas; mudar a cidade muda o feed na hora. */
export async function updateProfile(patch: ProfilePatch): Promise<User> {
  return (await api<{ user: User }>('/profile', { method: 'PATCH', json: patch })).user;
}
