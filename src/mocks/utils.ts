import { delay, HttpResponse } from 'msw';
import { API_URL } from '@/core/api/http';
import type { ApiErrorBody, ErrorDetail } from '@/core/types/api';

/** URL completa de uma rota da API, para os handlers: `apiUrl('/auth/me')`. */
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** Atraso artificial no navegador (para ver skeletons); zero nos testes. */
export const mockDelay = () => (import.meta.env.MODE === 'test' ? Promise.resolve() : delay(350));

/** Resposta de erro no formato do contrato, com x-request-id como a API real. */
export function apiError(status: number, error: string, message: string, details?: ErrorDetail[]) {
  const body: ApiErrorBody = details ? { error, message, details } : { error, message };
  return HttpResponse.json(body, {
    status,
    headers: { 'x-request-id': `mock-${Math.random().toString(36).slice(2, 10)}` },
  });
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Mesma regra da API (ADR-13): escrita sem X-Requested-With → 403 CSRF_HEADER_MISSING. */
export function csrfError(request: Request) {
  if (SAFE.has(request.method) || request.headers.get('x-requested-with') === 'XMLHttpRequest') return null;
  return apiError(403, 'CSRF_HEADER_MISSING', 'Requisição recusada por segurança. Atualize a página e tente de novo.');
}

export const unauthorized = () => apiError(401, 'UNAUTHORIZED', 'Faça login para continuar.');

export const validationError = (details: ErrorDetail[]) =>
  apiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details);

/** Mesma regra de senha da API. */
export const passwordProblem = (password: unknown): string | null => {
  if (typeof password !== 'string' || password.length < 8) return 'Mínimo de 8 caracteres';
  if (password.length > 72) return 'Máximo de 72 caracteres';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'A senha precisa de ao menos 1 letra e 1 número';
  return null;
};
