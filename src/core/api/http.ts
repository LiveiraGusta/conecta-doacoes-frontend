import type { ErrorDetail } from '../types/api';

/** URL base da API REST. Em dev, o backend roda em localhost:3333 (mesmo site que o Vite). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1';

/** URL do WebSocket derivada da REST: http → ws, https → wss. */
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/chats/ws`;

/** Erro da API com o formato `{ error, message, details? }` e o `x-request-id` para o suporte. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Erro de rede (sem resposta do servidor). */
  get isNetwork() {
    return this.status === 0;
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Corpo JSON (vira `content-type: application/json`). */
  json?: unknown;
  /** Corpo cru, ex.: `FormData` (o navegador põe o boundary; não defina content-type). */
  body?: BodyInit;
  /** Query string; `undefined`, `null` e `''` são omitidos. */
  query?: Query;
}

type UnauthorizedHandler = (path: string) => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Registrado pelo AuthProvider: um 401 fora de `/auth/*` significa sessão expirada ou derrubada
 * (troca de senha em outro aparelho, conta excluída). No `/auth/*` o 401 é do próprio fluxo
 * (credenciais erradas, visitante no `/auth/me`) e quem chama trata.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/** Avisa a sessão caída vinda de fora do fetch (WebSocket fechado com 4401). */
export function notifyUnauthorized(source: string) {
  onUnauthorized?.(source);
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_URL + path);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Cliente HTTP do app (guia de integração, §1.6):
 * - `credentials: 'include'`: o navegador envia e grava o cookie de sessão httpOnly (o JS nunca vê o token);
 * - `X-Requested-With` em toda requisição (anti-CSRF; obrigatório em POST/PUT/PATCH/DELETE);
 * - 202/204 sem corpo; erros viram `ApiError` com a `message` pronta em português.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, query, body: rawBody, headers: rawHeaders, ...init } = options;
  const headers = new Headers(rawHeaders);
  headers.set('x-requested-with', 'XMLHttpRequest');

  let body: BodyInit | undefined = rawBody;
  if (json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(json);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), { ...init, headers, body, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }

  if (res.status === 202 || res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.(path);
    const err = (data ?? {}) as { error?: string; message?: string; details?: ErrorDetail[] };
    throw new ApiError(
      res.status,
      err.error ?? 'INTERNAL_ERROR',
      err.message ?? 'Erro inesperado. Tente de novo.',
      err.details,
      res.headers.get('x-request-id') ?? undefined,
    );
  }
  return data as T;
}
