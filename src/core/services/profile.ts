import { api } from '../api/http';
import type { Category, FeedItem, Preferences, PublicUser, User, UserProfile } from '../types/api';

export interface AddressInput {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
}

/** Campos do PATCH /profile. Só os enviados mudam; `null` apaga. Os de ONG geram 400 para doador. */
export interface ProfilePatch {
  name?: string;
  city?: string;
  state?: string;
  bio?: string | null;
  website?: string | null;
  phone?: string | null;
  instagram?: string | null;
  accepted_categories?: Category[];
  address?: AddressInput | null;
}

const userOf = async (promise: Promise<{ user: User }>) => (await promise).user;

/** PATCH /profile (guia, F12). Cidade e UF vão sempre juntas; mudar a cidade muda o feed na hora. */
export const updateProfile = (patch: ProfilePatch) =>
  userOf(api<{ user: User }>('/profile', { method: 'PATCH', json: patch }));

function upload(path: string, field: string, file: File) {
  const fd = new FormData();
  fd.append(field, file);
  return userOf(api<{ user: User }>(path, { method: 'PUT', body: fd }));
}

/** Foto de perfil (doador e ONG): a API corta ao centro e grava 512×512. */
export const uploadAvatar = (file: File) => upload('/profile/avatar', 'avatar', file);
export const removeAvatar = () => userOf(api<{ user: User }>('/profile/avatar', { method: 'DELETE' }));

/** Banner da ONG: a API grava 1500×500. */
export const uploadBanner = (file: File) => upload('/profile/banner', 'banner', file);
export const removeBanner = () => userOf(api<{ user: User }>('/profile/banner', { method: 'DELETE' }));

/** Reenviar o documento da ONG rejeitada (volta para PENDENTE_APROVACAO). */
export const resubmitDocument = (file: File) => upload('/profile/ngo-document', 'document', file);

/** Cor, modo e (doador) mostrar doações. Parcial. */
export const updatePreferences = (patch: Partial<Preferences>) =>
  api<Preferences>('/profile/preferences', { method: 'PATCH', json: patch });

/** 204; encerra as outras sessões e renova o cookie desta (continua logado). */
export const changePassword = (current: string, next: string) =>
  api<void>('/profile/password', { method: 'PATCH', json: { current_password: current, new_password: next } });

/** 204; HAS_ACTIVE_NEGOTIATIONS se houver negociação em andamento. */
export const deleteAccount = (password: string) => api<void>('/profile', { method: 'DELETE', json: { password } });

// ── Página pessoal ──

export const fetchUserProfile = (id: string) => api<UserProfile>(`/users/${id}`);
export const fetchPublicUser = (id: string) => api<PublicUser>(`/public/users/${id}`);

export const USER_DONATIONS_PAGE = 12;
export const fetchUserDonations = (id: string, offset: number) =>
  api<{ total: number; data: FeedItem[]; hidden: boolean }>(`/users/${id}/donations`, {
    query: { limit: USER_DONATIONS_PAGE, offset },
  });
