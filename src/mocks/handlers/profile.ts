import { http, HttpResponse, passthrough } from 'msw';
import type { Category, PublicUser, User, UserProfile } from '@/core/types/api';
import { DOCUMENT_TYPES, IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/core/utils/files';
import { db } from '../db';
import { toFeedItem, abbreviateName } from './items';
import { apiError, apiUrl, csrfError, mockDelay, passwordProblem, unauthorized, validationError } from '../utils';

/**
 * Perfil completo (fase 6), página pessoal e ViaCEP, como no openapi.yaml.
 * Regras do PATCH /profile: só o que vier muda; `null` ou texto vazio apaga; campos de ONG enviados por doador → 400.
 */

const CATEGORIES: Category[] = ['ROUPAS', 'ALIMENTOS', 'BRINQUEDOS', 'LIVROS'];
const NGO_FIELDS = ['website', 'phone', 'instagram', 'accepted_categories', 'address'] as const;
const userNotFound = () => apiError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
const forbidden = () => apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');

function session(request: Request, { write = true } = {}) {
  if (write) {
    const csrf = csrfError(request);
    if (csrf) return { error: csrf };
  }
  const current = db.sessionUser();
  if (!current) return { error: unauthorized() };
  return { current };
}

const fileUrl = (file: File) =>
  typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : `data:${file.type};base64,`;

async function singleFile(request: Request, field: string, types: readonly string[]) {
  const form = await request.formData().catch(() => null);
  const files = form?.getAll(field).filter((f): f is File => typeof f !== 'string') ?? [];
  if (files.length !== 1 || !types.includes(files[0]!.type)) return { problem: 'type' as const };
  if (files[0]!.size > MAX_UPLOAD_BYTES) return { problem: 'size' as const };
  return { file: files[0]! };
}

type Body = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : v);

/** Valida e aplica o PATCH; devolve os `details` de erro (vazio = ok). */
function applyPatch(user: User, body: Body): { path: string; message: string }[] {
  const details: { path: string; message: string }[] = [];
  const err = (path: string, message: string) => details.push({ path, message });
  if (Object.keys(body).length === 0) err('body', 'Envie ao menos um campo');
  if (user.role !== 'NGO') NGO_FIELDS.filter((f) => f in body).forEach((f) => err(f, 'Campo só de ONG'));
  if ((body.city === undefined) !== (body.state === undefined)) {
    err(body.city === undefined ? 'city' : 'state', 'Informe cidade e UF juntas');
  }
  const name = text(body.name);
  if (name !== undefined && (typeof name !== 'string' || name.length < 2 || name.length > 255)) {
    err('name', 'Informe de 2 a 255 caracteres');
  }
  const city = text(body.city);
  if (city !== undefined && (typeof city !== 'string' || city.length < 2)) err('city', 'Mínimo de 2 caracteres');
  const bio = text(body.bio);
  if (typeof bio === 'string' && bio.length > 500) err('bio', 'Máximo de 500 caracteres');
  const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : body.phone;
  if (typeof phone === 'string' && phone !== '' && !/^[1-9]\d{9,10}$/.test(phone)) {
    err('phone', 'Telefone com DDD: 10 ou 11 dígitos');
  }
  const instagram =
    typeof body.instagram === 'string'
      ? (body.instagram.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? body.instagram.trim()).replace(/^@/, '')
      : body.instagram;
  if (typeof instagram === 'string' && instagram !== '' && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    err('instagram', 'Usuário inválido');
  }
  const website = text(body.website);
  if (typeof website === 'string' && website !== '' && !/^https?:\/\/\S+\.\S+/.test(website)) {
    err('website', 'Endereço inválido');
  }
  const categories = body.accepted_categories;
  if (
    categories !== undefined &&
    (!Array.isArray(categories) || categories.some((c) => !CATEGORIES.includes(c as Category)))
  ) {
    err('accepted_categories', 'Categoria inválida');
  }
  const address = body.address as Body | null | undefined;
  if (address) {
    const cep = typeof address.cep === 'string' ? address.cep.replace(/\D/g, '') : '';
    if (cep.length !== 8) err('address.cep', 'CEP com 8 dígitos');
    if (String(text(address.street) ?? '').length < 2) err('address.street', 'Informe a rua');
    if (String(text(address.number) ?? '').length < 1) err('address.number', 'Informe o número');
    if (String(text(address.neighborhood) ?? '').length < 2) err('address.neighborhood', 'Informe o bairro');
  }
  if (details.length) return details;

  const blank = (v: unknown) => (v === null || v === '' ? null : (v as string));
  if (name !== undefined) user.name = name as string;
  if (city !== undefined) user.city = city as string;
  if (body.state !== undefined) user.state = body.state as User['state'];
  if (bio !== undefined) user.bio = blank(bio);
  const ngo = user.ngo_profile;
  if (ngo) {
    if (website !== undefined) ngo.website = blank(website);
    if (phone !== undefined) ngo.phone = blank(phone);
    if (instagram !== undefined) ngo.instagram = blank(instagram);
    if (Array.isArray(categories)) ngo.accepted_categories = [...new Set(categories as Category[])];
    if (address === null) ngo.address = null;
    else if (address) {
      ngo.address = {
        cep: String(address.cep).replace(/\D/g, ''),
        street: String(text(address.street)),
        number: String(text(address.number)),
        complement: blank(text(address.complement) ?? null),
        neighborhood: String(text(address.neighborhood)),
      };
    }
  }
  return [];
}

const isListed = (u: User) => u.role === 'DONOR' || u.role === 'NGO';
const donatedBy = (u: User) =>
  [...db.state.items.values()].filter(
    (i) => i.status === 'DOADO' && (u.role === 'DONOR' ? i.donor_id === u.id : i.selected_ngo_id === u.id),
  );

/** Registro de quando a conta foi criada (o seed não tem: um mês atrás). */
const memberSince = () => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

function toUserProfile(u: User, viewer: User): UserProfile {
  const self = u.id === viewer.id;
  const showDonations = u.role === 'NGO' || u.preferences.show_donations || self;
  const ngo = u.ngo_profile;
  const contacts = ngo && (ngo.status === 'ATIVO' || self);
  return {
    id: u.id,
    role: u.role as 'DONOR' | 'NGO',
    name: u.role === 'DONOR' ? abbreviateName(u.name) : u.name,
    avatar_url: u.avatar_url,
    bio: u.bio,
    city: u.city,
    state: u.state,
    member_since: memberSince(),
    donations_count: showDonations ? donatedBy(u).length : null,
    ngo: ngo
      ? {
          status: ngo.status,
          website: ngo.website,
          banner_url: ngo.banner_url,
          accepted_categories: ngo.accepted_categories,
          phone: contacts ? ngo.phone : null,
          instagram: contacts ? ngo.instagram : null,
          address: contacts ? ngo.address : null,
        }
      : null,
  };
}

const CEPS: Record<string, { logradouro: string; bairro: string; localidade: string; uf: string }> = {
  '01310100': { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' },
  '01001000': { logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' },
  '20040002': { logradouro: 'Rua da Assembleia', bairro: 'Centro', localidade: 'Rio de Janeiro', uf: 'RJ' },
};

export const profileHandlers = [
  http.patch(apiUrl('/profile'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request);
    if (error) return error;
    const body = ((await request.json().catch(() => ({}))) ?? {}) as Body;
    const details = applyPatch(current.user, body);
    return details.length ? validationError(details) : HttpResponse.json({ user: current.user });
  }),

  http.delete(apiUrl('/profile'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request);
    if (error) return error;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    if (!body.password || body.password !== current.password) {
      return apiError(400, 'INVALID_CURRENT_PASSWORD', 'Senha incorreta.');
    }
    const active = [...db.state.items.values()].some(
      (i) => i.status === 'EM_PROGRESSO' && (i.donor_id === current.user.id || i.selected_ngo_id === current.user.id),
    );
    if (active) {
      return apiError(
        409,
        'HAS_ACTIVE_NEGOTIATIONS',
        'Você tem negociações em andamento. Conclua ou cancele antes de excluir a conta.',
      );
    }
    db.state.users.delete(current.user.id);
    db.loginAs(null);
    return new HttpResponse(null, { status: 204 });
  }),

  ...(['avatar', 'banner'] as const).flatMap((field) => [
    http.put(apiUrl(`/profile/${field}`), async ({ request }) => {
      await mockDelay();
      const { current, error } = session(request);
      if (error) return error;
      const { user } = current;
      if (user.role === 'ADMIN' || (field === 'banner' && user.role !== 'NGO')) return forbidden();
      const upload = await singleFile(request, field, IMAGE_TYPES);
      if (upload.problem === 'type') return apiError(400, 'INVALID_PHOTO', 'Envie uma imagem JPG, PNG ou WEBP.');
      if (upload.problem === 'size') return apiError(413, 'PAYLOAD_TOO_LARGE', 'A imagem pode ter até 5 MB.');
      if (field === 'avatar') user.avatar_url = fileUrl(upload.file);
      else user.ngo_profile!.banner_url = fileUrl(upload.file);
      return HttpResponse.json({ user });
    }),
    http.delete(apiUrl(`/profile/${field}`), async ({ request }) => {
      await mockDelay();
      const { current, error } = session(request);
      if (error) return error;
      const { user } = current;
      if (user.role === 'ADMIN' || (field === 'banner' && user.role !== 'NGO')) return forbidden();
      if (field === 'avatar') user.avatar_url = null;
      else user.ngo_profile!.banner_url = null;
      return HttpResponse.json({ user });
    }),
  ]),

  http.get(apiUrl('/profile/preferences'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request, { write: false });
    if (error) return error;
    return HttpResponse.json(current.user.preferences);
  }),

  http.patch(apiUrl('/profile/preferences'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request);
    if (error) return error;
    const body = (await request.json().catch(() => ({}))) as Body;
    const prefs = current.user.preferences;
    if ('show_donations' in body && current.user.role !== 'DONOR') {
      return validationError([{ path: 'show_donations', message: 'Só doadores escolhem mostrar as doações' }]);
    }
    if (
      body.theme_color !== undefined &&
      !['AZUL', 'VERDE', 'ROXO', 'LARANJA', 'ROSA'].includes(String(body.theme_color))
    ) {
      return validationError([{ path: 'theme_color', message: 'Cor inválida' }]);
    }
    if (body.theme_mode !== undefined && !['LIGHT', 'DARK', 'SYSTEM'].includes(String(body.theme_mode))) {
      return validationError([{ path: 'theme_mode', message: 'Modo inválido' }]);
    }
    Object.assign(prefs, body);
    return HttpResponse.json(prefs);
  }),

  http.patch(apiUrl('/profile/password'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request);
    if (error) return error;
    const body = (await request.json().catch(() => ({}))) as { current_password?: string; new_password?: string };
    if (body.current_password !== current.password) {
      return apiError(400, 'INVALID_CURRENT_PASSWORD', 'A senha atual não confere.');
    }
    const problem = passwordProblem(body.new_password);
    if (problem) return validationError([{ path: 'new_password', message: problem }]);
    if (body.new_password === current.password) {
      return apiError(400, 'SAME_PASSWORD', 'A nova senha precisa ser diferente da atual.');
    }
    current.password = body.new_password!;
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(apiUrl('/profile/ngo-document'), async ({ request }) => {
    await mockDelay();
    const { current, error } = session(request);
    if (error) return error;
    const ngo = current.user.ngo_profile;
    if (current.user.role !== 'NGO' || !ngo) return forbidden();
    if (ngo.status === 'ATIVO') return apiError(409, 'NGO_ALREADY_ACTIVE', 'Sua ONG já está aprovada.');
    const upload = await singleFile(request, 'document', DOCUMENT_TYPES);
    if (upload.problem) return apiError(400, 'INVALID_DOCUMENT', 'Envie um PDF, JPG, PNG ou WEBP de até 5 MB.');
    ngo.status = 'PENDENTE_APROVACAO';
    ngo.rejection_reason = null;
    return HttpResponse.json({ user: current.user });
  }),

  http.get(apiUrl('/users/:userId'), async ({ request, params }) => {
    await mockDelay();
    const { current, error } = session(request, { write: false });
    if (error) return error;
    const target = db.state.users.get(String(params.userId))?.user;
    if (!target || !isListed(target)) return userNotFound();
    return HttpResponse.json(toUserProfile(target, current.user));
  }),

  http.get(apiUrl('/users/:userId/donations'), async ({ request, params }) => {
    await mockDelay();
    const { current, error } = session(request, { write: false });
    if (error) return error;
    const target = db.state.users.get(String(params.userId))?.user;
    if (!target || !isListed(target)) return userNotFound();
    const self = target.id === current.user.id;
    if (target.role === 'DONOR' && !target.preferences.show_donations && !self) {
      return HttpResponse.json({ total: 0, data: [], hidden: true });
    }
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 30);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const items = donatedBy(target).sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
    return HttpResponse.json({
      total: items.length,
      data: items.slice(offset, offset + limit).map((i) => toFeedItem(i, current.user)),
      hidden: false,
    });
  }),

  http.get(apiUrl('/public/users/:userId'), async ({ params }) => {
    await mockDelay();
    const target = db.state.users.get(String(params.userId))?.user;
    if (!target || !isListed(target) || (target.role === 'NGO' && target.ngo_profile?.status !== 'ATIVO')) {
      return userNotFound();
    }
    const body: PublicUser = {
      id: target.id,
      role: target.role as 'DONOR' | 'NGO',
      city: target.city,
      state: target.state,
      bio: target.bio,
      accepted_categories: target.ngo_profile?.accepted_categories ?? [],
      donations_count: target.role === 'NGO' || target.preferences.show_donations ? donatedBy(target).length : null,
    };
    return HttpResponse.json(body);
  }),

  http.get('https://viacep.com.br/ws/:cep/json/', async ({ params }) => {
    await mockDelay();
    const found = CEPS[String(params.cep)];
    if (found) return HttpResponse.json({ cep: String(params.cep), ...found });
    // No dev:mock, CEP fora da lista consulta o ViaCEP de verdade; nos testes, nada sai para a internet.
    return import.meta.env.MODE === 'test' ? HttpResponse.json({ erro: 'true' }) : passthrough();
  }),
];
