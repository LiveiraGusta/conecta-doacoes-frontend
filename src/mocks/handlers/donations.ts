import { http, HttpResponse } from 'msw';
import type { Category, InterestedNgo, Item, ItemStatus, User } from '@/core/types/api';
import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/core/utils/files';
import { db } from '../db';
import { mockPhoto, type MockItem } from '../items';
import { apiError, apiUrl, csrfError, mockDelay, unauthorized, validationError } from '../utils';
import { toFeedItem } from './items';

/** Handlers da fase 4 (publicar, minhas doações/interesses, interessadas, escolher ONG), como no openapi.yaml. */

const CATEGORIES: Category[] = ['ROUPAS', 'ALIMENTOS', 'BRINQUEDOS', 'LIVROS'];
const STATUSES: ItemStatus[] = ['DISPONIVEL', 'EM_PROGRESSO', 'DOADO'];

const forbidden = () => apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
const itemNotFound = () => apiError(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');

function sessionWithRole(...roles: User['role'][]) {
  const current = db.sessionUser();
  if (!current) return { error: unauthorized() };
  if (!roles.includes(current.user.role)) return { error: forbidden() };
  return { user: current.user };
}

/** No navegador, a foto enviada aparece de verdade (blob:); sem suporte, uma foto gerada. */
const photoUrl = (file: File, title: string, category: Category, n: number) =>
  typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : mockPhoto(title, category, n);

const toItem = (i: MockItem): Item => ({
  id: i.id,
  donor_id: i.donor_id,
  title: i.title,
  description: i.description,
  notes: i.notes,
  category: i.category,
  city: i.city,
  state: i.state,
  status: i.status,
  selected_ngo_id: i.selected_ngo_id,
  photos: i.photos,
  created_at: i.created_at,
  completed_at: i.completed_at,
});

/** Mesmas regras do POST /items da API (VALIDATION_ERROR com `details` por campo). */
function itemFieldProblems(form: FormData) {
  const details: { path: string; message: string }[] = [];
  const text = (k: string) => (typeof form.get(k) === 'string' ? (form.get(k) as string).trim() : '');
  const title = text('title');
  if (title.length < 3 || title.length > 255) details.push({ path: 'title', message: 'Informe de 3 a 255 caracteres' });
  if (!CATEGORIES.includes(text('category') as Category))
    details.push({ path: 'category', message: 'Categoria inválida' });
  if (text('description').length > 2000) details.push({ path: 'description', message: 'Máximo de 2000 caracteres' });
  if (text('notes').length > 1000) details.push({ path: 'notes', message: 'Máximo de 1000 caracteres' });
  return {
    details,
    title,
    category: text('category') as Category,
    description: text('description'),
    notes: text('notes'),
  };
}

/** `interest_id` estável no formato UUID, derivado do item e da ONG. */
const interestId = (itemId: string, ngoId: string) => `${itemId.slice(0, 24)}${ngoId.slice(24)}`;

export const donationHandlers = [
  http.post(apiUrl('/items'), async ({ request }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = sessionWithRole('DONOR');
    if (error) return error;

    const form = await request.formData().catch(() => null);
    if (!form) return validationError([{ path: 'photos', message: 'Envie o formulário com as fotos' }]);
    const photos = form.getAll('photos').filter((p): p is File => typeof p !== 'string');
    if (photos.length !== 3) {
      return apiError(400, 'INVALID_PHOTO_COUNT', 'É obrigatório enviar exatamente 3 fotos do item.');
    }
    if (photos.some((p) => !(IMAGE_TYPES as readonly string[]).includes(p.type))) {
      return apiError(400, 'INVALID_PHOTO', 'Envie fotos JPG, PNG ou WEBP.');
    }
    if (photos.some((p) => p.size > MAX_UPLOAD_BYTES)) {
      return apiError(413, 'PAYLOAD_TOO_LARGE', 'Cada foto pode ter até 5 MB.');
    }
    const fields = itemFieldProblems(form);
    if (fields.details.length) return validationError(fields.details);

    const id = crypto.randomUUID();
    const item: MockItem = {
      id,
      donor_id: user.id,
      title: fields.title,
      description: fields.description || null,
      notes: fields.notes || null,
      category: fields.category,
      city: user.city,
      state: user.state,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      photos: photos.map((p, i) => ({
        id: `${id}-foto-${i + 1}`,
        photo_url: photoUrl(p, fields.title, fields.category, i + 1),
      })),
    };
    db.state.items.set(id, item);
    return HttpResponse.json(toItem(item), { status: 201 });
  }),

  // Antes de GET /items/:itemId (senão "me" vira um id).
  http.get(apiUrl('/items/me'), async ({ request }) => {
    await mockDelay();
    const { user, error } = sessionWithRole('DONOR', 'NGO');
    if (error) return error;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    if (status && !STATUSES.includes(status as ItemStatus)) {
      return validationError([{ path: 'status', message: 'Status inválido' }]);
    }
    const limit = Number(url.searchParams.get('limit') ?? 30);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const mine = [...db.state.items.values()]
      .filter((i) => (user.role === 'DONOR' ? i.donor_id === user.id : db.hasInterest(i.id, user.id)))
      .filter((i) => !status || i.status === status)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return HttpResponse.json({
      total: mine.length,
      data: mine.slice(offset, offset + limit).map((i) => toFeedItem(i, user)),
    });
  }),

  http.get(apiUrl('/items/:itemId/interests'), async ({ params }) => {
    await mockDelay();
    const { user, error } = sessionWithRole('DONOR');
    if (error) return error;
    const item = db.state.items.get(String(params.itemId));
    if (!item) return itemNotFound();
    if (item.donor_id !== user.id) return forbidden();

    const ngos: InterestedNgo[] = [...db.state.interests.entries()]
      .filter(([key]) => key.startsWith(`${item.id}:`))
      .flatMap(([key, likedAt]) => {
        const ngo = db.state.users.get(key.split(':')[1]!)?.user;
        if (!ngo?.ngo_profile) return [];
        return [
          {
            interest_id: interestId(item.id, ngo.id),
            ngo_id: ngo.id,
            name: ngo.name,
            avatar_url: ngo.avatar_url,
            city: ngo.city,
            state: ngo.state,
            cnpj: ngo.ngo_profile.cnpj,
            website: ngo.ngo_profile.website,
            ngo_status: ngo.ngo_profile.status,
            liked_at: likedAt,
          },
        ];
      })
      // ATIVO primeiro, depois pela data do like.
      .sort(
        (a, b) =>
          Number(b.ngo_status === 'ATIVO') - Number(a.ngo_status === 'ATIVO') || a.liked_at.localeCompare(b.liked_at),
      );
    return HttpResponse.json({ item_id: item.id, total: ngos.length, interested_ngos: ngos });
  }),

  http.post(apiUrl('/items/:itemId/select-ngo'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = sessionWithRole('DONOR');
    if (error) return error;
    const body = (await request.json().catch(() => null)) as { ngo_id?: unknown } | null;
    if (typeof body?.ngo_id !== 'string') return validationError([{ path: 'ngo_id', message: 'Informe a ONG' }]);
    const item = db.state.items.get(String(params.itemId));
    if (!item) return itemNotFound();
    if (item.donor_id !== user.id) return forbidden();
    if (item.status !== 'DISPONIVEL') {
      return apiError(409, 'ITEM_NOT_AVAILABLE', 'Este item já está em negociação ou foi doado.');
    }
    if (!db.hasInterest(item.id, body.ngo_id)) {
      return apiError(409, 'NGO_NOT_INTERESTED', 'Esta ONG não demonstrou interesse no item.');
    }
    if (db.state.users.get(body.ngo_id)?.user.ngo_profile?.status !== 'ATIVO') {
      return apiError(409, 'NGO_NOT_ACTIVE', 'Esta ONG não está ativa no momento.');
    }
    item.status = 'EM_PROGRESSO';
    item.selected_ngo_id = body.ngo_id;
    return HttpResponse.json({
      item_id: item.id,
      status: 'EM_PROGRESSO',
      selected_ngo_id: body.ngo_id,
      chat_room_url: `/chats/${item.id}`,
    });
  }),
];
