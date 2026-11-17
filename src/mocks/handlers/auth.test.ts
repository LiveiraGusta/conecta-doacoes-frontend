// @vitest-environment node
// Teste de rede (sem tela): no ambiente node, FormData/File/fetch são nativos e o multipart chega inteiro ao MSW.
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import { api, buildUrl } from '@/core/api/http';
import type { User } from '@/core/types/api';
import { IDS, MOCK_PASSWORD } from '../db';
import { MOCK_RESET_TOKEN } from './auth';

/**
 * Os mocks precisam se comportar como o contrato (openapi.yaml), senão o dev:mock e os testes mentem.
 */
const me = () => api<{ user: User }>('/auth/me');

describe('mocks de /auth', () => {
  it('visitante: /auth/me responde 401 UNAUTHORIZED', async () => {
    await expect(me()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });

  it('login certo abre a sessão; logout fecha (204 sem corpo)', async () => {
    const { user } = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      json: { email: 'DOADORA@demo.conectadoacoes.local ', password: MOCK_PASSWORD },
    });
    expect(user).toMatchObject({ id: IDS.donor, role: 'DONOR', preferences: { show_donations: true } });
    expect(user).not.toHaveProperty('token');
    expect((await me()).user.id).toBe(IDS.donor);

    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
    await expect(me()).rejects.toMatchObject({ status: 401 });
  });

  it('login errado: 401 INVALID_CREDENTIALS genérico', async () => {
    const err = (await api('/auth/login', { method: 'POST', json: { email: 'nao@existe.dev', password: 'x' } }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(err).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' });
    expect(err.requestId).toMatch(/^mock-/);
  });

  it('escrita sem X-Requested-With: 403 CSRF_HEADER_MISSING (igual à API)', async () => {
    const res = await fetch(buildUrl('/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'doadora@demo.conectadoacoes.local', password: MOCK_PASSWORD }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'CSRF_HEADER_MISSING' });
  });

  it('cadastro de doador: 201 já logado; e-mail repetido 409; senha fora da regra 400 no campo', async () => {
    const body = { name: 'Ana Lima', email: 'ana@x.com', password: 'Senha123', city: 'Campinas', state: 'SP' };
    const { user } = await api<{ user: User }>('/auth/register/donor', { method: 'POST', json: body });
    expect(user).toMatchObject({ name: 'Ana Lima', role: 'DONOR', city: 'Campinas', bio: null, avatar_url: null });
    expect((await me()).user.id).toBe(user.id);

    await expect(api('/auth/register/donor', { method: 'POST', json: body })).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
    await expect(
      api('/auth/register/donor', { method: 'POST', json: { ...body, email: 'b@x.com', password: 'curta' } }),
    ).rejects.toMatchObject({ status: 400, details: [{ path: 'password' }] });
  });

  it('cadastro de ONG (multipart): nasce PENDENTE_APROVACAO; sem documento é INVALID_DOCUMENT', async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      name: 'ONG Nova',
      email: 'nova@ong.org',
      password: 'Senha123',
      city: 'São Paulo',
      state: 'SP',
      cnpj: '11.222.333/0001-81',
    })) {
      fd.append(k, v);
    }
    await expect(api('/auth/register/ngo', { method: 'POST', body: fd })).rejects.toMatchObject({
      code: 'INVALID_DOCUMENT',
    });

    fd.append('document', new File(['%PDF-1.4'], 'cnpj.pdf', { type: 'application/pdf' }));
    const { user } = await api<{ user: User }>('/auth/register/ngo', { method: 'POST', body: fd });
    expect(user.ngo_profile).toMatchObject({ status: 'PENDENTE_APROVACAO', rejection_reason: null, address: null });
  });

  it('recuperação de senha: forgot sempre 202; reset aceita só o token de mock', async () => {
    await expect(
      api('/auth/password/forgot', { method: 'POST', json: { email: 'qualquer@x.com' } }),
    ).resolves.toBeUndefined();
    await expect(
      api('/auth/password/reset', { method: 'POST', json: { token: 'outro', new_password: 'Senha123' } }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
    await expect(
      api('/auth/password/reset', { method: 'POST', json: { token: MOCK_RESET_TOKEN, new_password: 'Senha123' } }),
    ).resolves.toBeUndefined();
  });
});
