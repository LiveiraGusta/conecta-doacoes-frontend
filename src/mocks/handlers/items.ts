import { http, HttpResponse } from 'msw';
import type { FeedItem, ItemDetail, PublicItem, User } from '@/core/types/api';
import { db } from '../db';
import type { MockItem } from '../items';
import { apiError, apiUrl, csrfError, mockDelay, unauthorized, validationError } from '../utils';

/**
 * Handlers de itens e interesse seguindo o openapi.yaml (feed logado, visitante, detalhe, "Tenho interesse"
 * e denúncia de anúncio).
 */

/** Pessoas diferentes com denúncia de anúncio aberta para o item sair do ar sozinho (igual à API). */
export const AUTO_HIDE_THRESHOLD = 3;
export const REPORT_CATEGORIES = ['NUDEZ', 'ODIO', 'VIOLENCIA', 'GOLPE', 'PROIBIDO', 'SPAM', 'OUTRO'] as const;

/** "Marina Souza" → "Marina S." (igual à API). */
export const abbreviateName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length < 2 ? (parts[0] ?? '') : `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
};

/** Fora de VISIVEL (oculto por denúncias ou removido pelo Admin), o anúncio some de todas as listas. */
export const isVisible = (i: MockItem) => i.moderation_status === 'VISIVEL';
const inFeed = (i: MockItem) => isVisible(i) && (i.status === 'DISPONIVEL' || i.status === 'EM_PROGRESSO');
/** Anúncio fora do ar: só o doador, a ONG escolhida e o Admin abrem o detalhe. */
const canSee = (i: MockItem, viewer: User) =>
  isVisible(i) || viewer.role === 'ADMIN' || viewer.id === i.donor_id || viewer.id === i.selected_ngo_id;

/** Moderação como a API devolve: o motivo só vai para o doador. */
const moderationOf = (item: MockItem, viewer: User) => ({
  moderation_status: item.moderation_status,
  moderation_reason: viewer.id === item.donor_id ? item.moderation_reason : null,
});
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
  ...moderationOf(item, viewer),
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
  ...moderationOf(item, viewer),
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
    return item && canSee(item, current.user) ? HttpResponse.json(toDetail(item, current.user)) : itemNotFound();
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
    if (!item || !isVisible(item)) return itemNotFound();
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

  http.post(apiUrl('/items/:itemId/report'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { viewer, error } = sessionViewer();
    if (error) return error;
    const item = db.state.items.get(String(params.itemId));
    if (!item || item.moderation_status === 'REMOVIDO') return itemNotFound();
    if (item.donor_id === viewer.id) {
      return apiError(403, 'FORBIDDEN', 'Você não pode denunciar o próprio anúncio.');
    }
    if (item.moderation_status === 'OCULTO' && viewer.id !== item.selected_ngo_id) return itemNotFound();

    const body = (await request.json().catch(() => null)) as { category?: unknown; reason?: unknown } | null;
    const category = body?.category as (typeof REPORT_CATEGORIES)[number];
    if (!REPORT_CATEGORIES.includes(category)) {
      return validationError([{ path: 'category', message: 'Escolha o motivo da denúncia' }]);
    }
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length > 1000) return validationError([{ path: 'reason', message: 'Máximo de 1000 caracteres' }]);
    if (category === 'OUTRO' && reason.length < 10) {
      return validationError([{ path: 'reason', message: 'Descreva o problema (mínimo de 10 caracteres)' }]);
    }
    const open = [...db.state.reports.values()].filter(
      (r) => r.item_id === item.id && r.kind === 'ITEM' && r.status === 'ABERTA',
    );
    if (open.some((r) => r.reporter_id === viewer.id)) {
      return apiError(409, 'ITEM_ALREADY_REPORTED', 'Você já denunciou este anúncio. Nossa equipe vai analisar.');
    }
    const report = {
      id: crypto.randomUUID(),
      item_id: item.id,
      reporter_id: viewer.id,
      reported_id: item.donor_id,
      kind: 'ITEM' as const,
      category,
      reason: reason || null,
      status: 'ABERTA' as const,
      resolution: null,
      created_at: new Date().toISOString(),
    };
    db.state.reports.set(report.id, report);
    const reporters = new Set([...open.map((r) => r.reporter_id), viewer.id]);
    if (reporters.size >= AUTO_HIDE_THRESHOLD && item.moderation_status === 'VISIVEL') {
      item.moderation_status = 'OCULTO';
    }
    return HttpResponse.json(report, { status: 201 });
  }),
];
