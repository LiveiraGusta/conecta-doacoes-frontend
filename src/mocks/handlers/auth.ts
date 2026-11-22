import { http, HttpResponse } from 'msw';
import type { User } from '@/core/types/api';
import { db } from '../db';
import { apiError, apiUrl, csrfError, mockDelay, passwordProblem, unauthorized, validationError } from '../utils';

/** Handlers de /auth/* seguindo o openapi.yaml (login, cadastros, sessão e recuperação de senha). */

/** Token aceito pelo mock em /auth/password/reset (o link de dev seria /redefinir-senha?token=token-valido). */
export const MOCK_RESET_TOKEN = 'token-valido';

const newId = () => crypto.randomUUID();

export const authHandlers = [
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const found = body.email ? db.findByEmail(body.email) : null;
    if (!found || found.password !== body.password) {
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
    }
    db.loginAs(found.user.id);
    return HttpResponse.json({ user: found.user });
  }),

  http.post(apiUrl('/auth/register/donor'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const body = (await request.json().catch(() => ({}))) as Partial<
      Record<'name' | 'email' | 'password' | 'city' | 'state', string>
    >;
    const problems = [
      !body.name || body.name.trim().length < 2 ? { path: 'name', message: 'Mínimo de 2 caracteres' } : null,
      !body.email?.includes('@') ? { path: 'email', message: 'E-mail inválido' } : null,
      passwordProblem(body.password) ? { path: 'password', message: passwordProblem(body.password)! } : null,
      !body.city ? { path: 'city', message: 'Campo obrigatório' } : null,
      !body.state ? { path: 'state', message: 'Campo obrigatório' } : null,
    ].filter((p) => p !== null);
    if (problems.length) return validationError(problems);
    if (db.findByEmail(body.email!)) return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.');

    const user: User = {
      id: newId(),
      name: body.name!.trim(),
      email: body.email!.trim().toLowerCase(),
      role: 'DONOR',
      city: body.city!,
      state: body.state as User['state'],
      bio: null,
      avatar_url: null,
      preferences: { theme_color: 'AZUL', theme_mode: 'SYSTEM', show_donations: false },
    };
    db.insertUser(user, body.password!);
    db.loginAs(user.id);
    return HttpResponse.json({ user }, { status: 201 });
  }),

  http.post(apiUrl('/auth/register/ngo'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const form = await request.formData().catch(() => null);
    const field = (k: string) => (typeof form?.get(k) === 'string' ? (form.get(k) as string) : '');
    const document = form?.get('document');
    if (!(document instanceof File)) {
      return apiError(400, 'INVALID_DOCUMENT', 'Envie 1 documento em PDF, JPG, PNG ou WEBP de até 5 MB.');
    }
    if (passwordProblem(field('password'))) {
      return validationError([{ path: 'password', message: passwordProblem(field('password'))! }]);
    }
    if (db.findByEmail(field('email'))) return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.');

    const user: User = {
      id: newId(),
      name: field('name'),
      email: field('email').trim().toLowerCase(),
      role: 'NGO',
      city: field('city'),
      state: field('state') as User['state'],
      bio: null,
      avatar_url: null,
      preferences: { theme_color: 'AZUL', theme_mode: 'SYSTEM', show_donations: false },
      ngo_profile: {
        id: newId(),
        cnpj: field('cnpj'),
        website: field('website') || null,
        status: 'PENDENTE_APROVACAO',
        rejection_reason: null,
        banner_url: null,
        phone: null,
        instagram: null,
        accepted_categories: [],
        address: null,
      },
    };
    db.insertUser(user, field('password'));
    if (typeof URL.createObjectURL === 'function') db.state.documents.set(user.id, URL.createObjectURL(document));
    db.loginAs(user.id);
    return HttpResponse.json({ user }, { status: 201 });
  }),

  http.post(apiUrl('/auth/logout'), async ({ request }) => {
    const csrf = csrfError(request);
    if (csrf) return csrf;
    db.loginAs(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl('/auth/me'), async () => {
    await mockDelay();
    const current = db.sessionUser();
    return current ? HttpResponse.json({ user: current.user }) : unauthorized();
  }),

  http.post(apiUrl('/auth/password/forgot'), async ({ request }) => {
    await mockDelay();
    return csrfError(request) ?? new HttpResponse(null, { status: 202 });
  }),

  http.post(apiUrl('/auth/password/reset'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const body = (await request.json().catch(() => ({}))) as { token?: string; new_password?: string };
    if (body.token !== MOCK_RESET_TOKEN) {
      return apiError(400, 'INVALID_RESET_TOKEN', 'Link de redefinição inválido ou expirado. Peça um novo.');
    }
    const problem = passwordProblem(body.new_password);
    if (problem) return validationError([{ path: 'new_password', message: problem }]);
    return new HttpResponse(null, { status: 204 });
  }),
];
