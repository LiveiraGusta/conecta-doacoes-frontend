// @vitest-environment node
// Rede com upload: no ambiente node o multipart com File chega inteiro ao MSW (ver src/test/setup.ts).
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db } from '@/mocks/db';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { fetchCities, normalizeText } from './ibge';
import { fetchMe, forgotPassword, login, registerDonor, registerNgo, resetPassword } from './auth';

describe('serviços de autenticação', () => {
  it('registerNgo monta o multipart do guia: campos, site opcional e 1 arquivo em `document`', async () => {
    let received: FormData | null = null;
    server.use(
      http.post(apiUrl('/auth/register/ngo'), async ({ request }) => {
        received = await request.formData();
        return HttpResponse.json({ user: db.state.users.values().next().value!.user }, { status: 201 });
      }),
    );
    await registerNgo({
      name: 'ONG Nova',
      email: 'nova@ong.org',
      password: 'Senha123',
      city: 'Campinas',
      state: 'SP',
      cnpj: '11.222.333/0001-81',
      document: new File(['%PDF-1.4'], 'cnpj.pdf', { type: 'application/pdf' }),
    });
    const fd = received! as FormData;
    expect([...fd.keys()].sort()).toEqual(['city', 'cnpj', 'document', 'email', 'name', 'password', 'state']);
    expect((fd.get('document') as File).name).toBe('cnpj.pdf');
  });

  it('login, cadastro de doador e sessão', async () => {
    const user = await registerDonor({
      name: 'Ana',
      email: 'ana2@x.com',
      password: 'Senha123',
      city: 'Campinas',
      state: 'SP',
    });
    expect(await fetchMe()).toMatchObject({ id: user.id });
    expect(await login({ email: 'ana2@x.com', password: 'Senha123' })).toMatchObject({ id: user.id });
  });

  it('fetchMe: visitante é null; outros erros sobem', async () => {
    expect(await fetchMe()).toBeNull();
    server.use(
      http.get(apiUrl('/auth/me'), () => HttpResponse.json({ error: 'INTERNAL_ERROR', message: 'x' }, { status: 500 })),
    );
    await expect(fetchMe()).rejects.toMatchObject({ status: 500 });
  });

  it('esqueci e redefinir senha não têm corpo', async () => {
    await expect(forgotPassword('x@y.com')).resolves.toBeUndefined();
    await expect(resetPassword('token-valido', 'Senha123')).resolves.toBeUndefined();
  });

  it('IBGE: lista de nomes; erro HTTP vira exceção; busca ignora acento e caixa', async () => {
    expect(await fetchCities('RJ')).toEqual(['Niterói', 'Rio de Janeiro']);
    server.use(
      http.get(
        'https://servicodados.ibge.gov.br/api/v1/localidades/estados/:uf/municipios',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    await expect(fetchCities('SP')).rejects.toThrow('IBGE respondeu 503');
    expect(normalizeText('  São PAULO ')).toBe('sao paulo');
  });
});
