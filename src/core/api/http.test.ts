import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { api, ApiError, buildUrl, setUnauthorizedHandler, WS_URL } from './http';

describe('api()', () => {
  it('envia credentials: include e o header anti-CSRF em toda requisição', async () => {
    // O fetch do Node ignora `credentials` no Request que chega ao mock: confere na chamada ao fetch.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const seen = vi.fn();
    server.use(
      http.get(apiUrl('/teste'), ({ request }) => {
        seen(request.headers.get('x-requested-with'));
        return HttpResponse.json({ ok: true });
      }),
    );
    expect(await api('/teste')).toEqual({ ok: true });
    expect(fetchSpy.mock.calls[0]![1]).toMatchObject({ credentials: 'include' });
    expect(seen).toHaveBeenCalledWith('XMLHttpRequest');
  });

  it('json vira corpo com content-type; FormData vai sem content-type manual (boundary do navegador)', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.post(apiUrl('/teste'), async ({ request }) => {
        seen.push(request.headers.get('content-type'));
        return HttpResponse.json({ ok: true });
      }),
    );
    await api('/teste', { method: 'POST', json: { a: 1 } });
    const fd = new FormData();
    fd.append('title', 'Casaco');
    await api('/teste', { method: 'POST', body: fd });
    expect(seen[0]).toBe('application/json');
    expect(seen[1]).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('202 e 204 resolvem sem corpo', async () => {
    server.use(
      http.post(apiUrl('/aceito'), () => new HttpResponse(null, { status: 202 })),
      http.delete(apiUrl('/vazio'), () => new HttpResponse(null, { status: 204 })),
    );
    await expect(api('/aceito', { method: 'POST' })).resolves.toBeUndefined();
    await expect(api('/vazio', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('erro da API vira ApiError com código, mensagem, details e x-request-id', async () => {
    server.use(
      http.post(apiUrl('/teste'), () =>
        HttpResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Dados inválidos.',
            details: [{ path: 'title', message: 'Mínimo de 3 caracteres' }],
          },
          { status: 400, headers: { 'x-request-id': 'req-123' } },
        ),
      ),
    );
    const err = await api('/teste', { method: 'POST', json: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      details: [{ path: 'title', message: 'Mínimo de 3 caracteres' }],
      requestId: 'req-123',
      isNetwork: false,
    });
  });

  it('erro sem corpo JSON vira INTERNAL_ERROR com mensagem genérica', async () => {
    server.use(http.get(apiUrl('/teste'), () => new HttpResponse('Bad Gateway', { status: 502 })));
    await expect(api('/teste')).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado. Tente de novo.',
    });
  });

  it('falha de rede vira ApiError status 0 (NETWORK_ERROR)', async () => {
    server.use(http.get(apiUrl('/teste'), () => HttpResponse.error()));
    const err = (await api('/teste').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.isNetwork).toBe(true);
  });

  it('401 fora de /auth/* chama o handler de sessão expirada; em /auth/* não', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    server.use(
      http.get(apiUrl('/items/feed'), () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
    );
    await expect(api('/items/feed')).rejects.toMatchObject({ status: 401 });
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 }); // visitante: o mock responde 401
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith('/items/feed');
    setUnauthorizedHandler(null);
  });
});

describe('buildUrl e WS_URL', () => {
  it('omite undefined, null e vazio da query', () => {
    const url = new URL(
      buildUrl('/items/feed', { category: 'ROUPAS', search: '', limit: 30, offset: 0, x: undefined, y: null }),
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({ category: 'ROUPAS', limit: '30', offset: '0' });
  });

  it('deriva o WebSocket da URL REST', () => {
    expect(WS_URL).toBe('ws://localhost:3333/api/v1/chats/ws');
  });
});
