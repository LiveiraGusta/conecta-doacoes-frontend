import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';

/** Não adianta tentar de novo: o servidor respondeu com uma decisão (4xx). Rede e 5xx tentam 2 vezes. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
