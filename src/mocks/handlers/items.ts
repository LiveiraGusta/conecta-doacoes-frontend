import { http, HttpResponse } from 'msw';
import type { FeedItem, ItemDetail, PublicItem, User } from '@/core/types/api';
import { db } from '../db';
import type { MockItem } from '../items';
import { apiError, apiUrl, csrfError, mockDelay, unauthorized } from '../utils';

/** Handlers de itens e interesse seguindo o openapi.yaml (feed logado, visitante, detalhe e "Tenho interesse"). */

/** "Marina Souza" → "Marina S." (igual à API). */
export const abbreviateName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length < 2 ? (parts[0] ?? '') : `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
};

const inFeed = (i: MockItem) => i.status === 'DISPONIVEL' || i.status === 'EM_PROGRESSO';
const newestFirst = (a: MockItem, b: MockItem) => b.created_at.localeCompare(a.created_at);

function filterAndPage(items: MockItem[], url: URL) {
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search')?.trim().toLowerCase();
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const found = items
    .filter((i) => !category || i.category === category)
    .filter((i) => !search || `${i.title} ${i.description ?? ''}`.toLowerCase().includes(search))
    .sort(newestFirst);
  return { total: found.length, rows: found.slice(offset, offset + limit) };
}

/** Contexto de quem vê (igual à API): só ONG ATIVO vê "já curti"; `is_selected` só para a ONG escolhida. */
function viewerContext(item: MockItem, viewer: User) {
  const activeNgo = viewer.role === 'NGO' && viewer.ngo_profile?.status === 'ATIVO';
  return {
    has_user_interest: activeNgo && db.hasInterest(item.id, viewer.id),
    interests_count: db.interestsCount(item.id),
    is_selected: viewer.role === 'NGO' && item.selected_ngo_id === viewer.id,
  };
}

const donorOf = (item: MockItem) => {
  const donor = db.state.users.get(item.donor_id)?.user;
  return {
    id: item.donor_id,
    name: abbreviateName(donor?.name ?? 'Usuário removido'),
    avatar_url: donor?.avatar_url ?? null,
  };
};

export const toFeedItem = (item: MockItem, viewer: User): FeedItem => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  city: item.city,
  state: item.state,
  status: item.status,
  created_at: item.created_at,
  donor: donorOf(item),
  photos: item.photos.map((p) => p.photo_url),
  ...viewerContext(item, viewer),
});

const toPublicItem = (item: MockItem): PublicItem => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  city: item.city,
  state: item.state,
  status: item.status as PublicItem['status'],
  created_at: item.created_at,
  photos: item.photos.map((p) => p.photo_url),
});

const toDetail = (item: MockItem, viewer: User): ItemDetail => ({
  id: item.id,
  donor_id: item.donor_id,
  title: item.title,
  description: item.description,
  notes: item.notes,
  category: item.category,
  city: item.city,
  state: item.state,
  status: item.status,
  selected_ngo_id: item.selected_ngo_id,
  photos: item.photos,
  created_at: item.created_at,
  completed_at: item.completed_at,
  donor: donorOf(item),
  ...viewerContext(item, viewer),
});

/** Sessão de doador ou ONG (Admin não tem feed: 403). */
function sessionViewer() {
  const current = db.sessionUser();
  if (!current) return { error: unauthorized() };
  if (current.user.role === 'ADMIN')
    return { error: apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.') };
  return { viewer: current.user };
}

const itemNotFound = () => apiError(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');

export const itemHandlers = [
  http.get(apiUrl('/items/feed'), async ({ request }) => {
    await mockDelay();
    const { viewer, error } = sessionViewer();
    if (error) return error;
    const mine = [...db.state.items.values()].filter(
      (i) => inFeed(i) && i.city === viewer.city && i.state === viewer.state,
    );
    const page = filterAndPage(mine, new URL(request.url));
    return HttpResponse.json({ total: page.total, data: page.rows.map((i) => toFeedItem(i, viewer)) });
  }),

  http.get(apiUrl('/public/items'), async ({ request }) => {
    await mockDelay();
    const page = filterAndPage([...db.state.items.values()].filter(inFeed), new URL(request.url));
    return HttpResponse.json({ total: page.total, data: page.rows.map(toPublicItem) });
  }),

  http.get(apiUrl('/public/items/:itemId'), async ({ params }) => {
    await mockDelay();
    const item = db.state.items.get(String(params.itemId));
    return item && inFeed(item) ? HttpResponse.json(toPublicItem(item)) : itemNotFound();
  }),

  http.get(apiUrl('/items/:itemId'), async ({ params }) => {
    await mockDelay();
    const current = db.sessionUser();
    if (!current) return unauthorized();
    const item = db.state.items.get(String(params.itemId));
    return item ? HttpResponse.json(toDetail(item, current.user)) : itemNotFound();
  }),

  http.post(apiUrl('/items/:itemId/interest'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const current = db.sessionUser();
    if (!current) return unauthorized();
    const ngo = current.user;
    if (ngo.role !== 'NGO') return apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
    if (ngo.ngo_profile?.status !== 'ATIVO')
      return apiError(403, 'NGO_NOT_APPROVED', 'Sua ONG ainda não foi aprovada.');
    const item = db.state.items.get(String(params.itemId));
    if (!item) return itemNotFound();
    if (item.city !== ngo.city || item.state !== ngo.state) {
      return apiError(403, 'OUT_OF_REGION', 'Este item não está na sua cidade.');
    }
    if (item.status !== 'DISPONIVEL') {
      return apiError(409, 'ITEM_NOT_AVAILABLE', 'Este item já está em negociação ou foi doado.');
    }
    if (db.hasInterest(item.id, ngo.id)) {
      return apiError(409, 'ALREADY_INTERESTED', 'Você já demonstrou interesse neste item.');
    }
    const createdAt = new Date().toISOString();
    db.state.interests.set(`${item.id}:${ngo.id}`, createdAt);
    return HttpResponse.json(
      { id: crypto.randomUUID(), item_id: item.id, ngo_id: ngo.id, created_at: createdAt },
      { status: 201 },
    );
  }),

  http.delete(apiUrl('/items/:itemId/interest'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const current = db.sessionUser();
    if (!current) return unauthorized();
    const item = db.state.items.get(String(params.itemId));
    if (!item) return itemNotFound();
    if (!db.hasInterest(item.id, current.user.id)) {
      return apiError(404, 'INTEREST_NOT_FOUND', 'Você não demonstrou interesse neste item.');
    }
    if (item.selected_ngo_id === current.user.id) {
      return apiError(
        409,
        'ALREADY_SELECTED',
        'Sua ONG já foi escolhida para este item. Para desistir, cancele a negociação.',
      );
    }
    db.state.interests.delete(`${item.id}:${current.user.id}`);
    return new HttpResponse(null, { status: 204 });
  }),
];
