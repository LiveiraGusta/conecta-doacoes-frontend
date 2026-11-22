import { describe, expect, it } from 'vitest';
import { ApiError } from './http';
import { createQueryClient, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('não repete erros 4xx (o servidor já decidiu)', () => {
    for (const status of [400, 401, 403, 404, 409, 429]) {
      expect(shouldRetry(0, new ApiError(status, 'X', 'x'))).toBe(false);
    }
  });

  it('repete até 2 vezes rede, 5xx e erros desconhecidos', () => {
    for (const err of [
      new ApiError(0, 'NETWORK_ERROR', 'x'),
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'x'),
      new Error('x'),
    ]) {
      expect(shouldRetry(0, err)).toBe(true);
      expect(shouldRetry(1, err)).toBe(true);
      expect(shouldRetry(2, err)).toBe(false);
    }
  });

  it('createQueryClient usa a regra e não repete mutations', () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.retry).toBe(shouldRetry);
    expect(qc.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
