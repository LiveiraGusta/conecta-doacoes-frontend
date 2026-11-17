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

/** Login: a API grava o cookie de sessão e devolve só o usuário (ADR-13). */
export async function login(input: { email: string; password: string }): Promise<User> {
  return (await api<{ user: User }>('/auth/login', { method: 'POST', json: input })).user;
}

export interface DonorRegistration {
  name: string;
  email: string;
  password: string;
  city: string;
  state: string;
}

export async function registerDonor(input: DonorRegistration): Promise<User> {
  return (await api<{ user: User }>('/auth/register/donor', { method: 'POST', json: input })).user;
}

export interface NgoRegistration extends DonorRegistration {
  cnpj: string;
  website?: string;
  document: File;
}

/** Cadastro de ONG em multipart (guia, F2): campos + 1 arquivo `document`. A ONG nasce PENDENTE_APROVACAO. */
export async function registerNgo(input: NgoRegistration): Promise<User> {
  const fd = new FormData();
  const { document, website, ...fields } = input;
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  if (website) fd.append('website', website);
  fd.append('document', document);
  return (await api<{ user: User }>('/auth/register/ngo', { method: 'POST', body: fd })).user;
}

/** Sempre 202 (não revela se o e-mail existe). */
export function forgotPassword(email: string): Promise<void> {
  return api<void>('/auth/password/forgot', { method: 'POST', json: { email } });
}

/** 204 com sucesso; `INVALID_RESET_TOKEN` se o link é inválido, expirou ou já foi usado. */
export function resetPassword(token: string, newPassword: string): Promise<void> {
  return api<void>('/auth/password/reset', { method: 'POST', json: { token, new_password: newPassword } });
}
