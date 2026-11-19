import { api } from '../api/http';
import type {
  Category,
  FeedItem,
  Interest,
  InterestList,
  Item,
  ItemDetail,
  ItemStatus,
  Paginated,
  PublicItem,
  Report,
  ReportCategory,
  Selection,
} from '../types/api';

export interface FeedFilters {
  category?: Category;
  search?: string;
}

/** Itens por página do feed (a API aceita até 50). */
export const FEED_PAGE_SIZE = 12;

const feedQuery = (f: FeedFilters, offset: number) => ({
  category: f.category,
  search: f.search?.trim() || undefined,
  limit: FEED_PAGE_SIZE,
  offset,
});

/** Feed da cidade/UF de quem está logado (guia, F7). */
export const fetchFeed = (f: FeedFilters, offset: number) =>
  api<Paginated<FeedItem>>('/items/feed', { query: feedQuery(f, offset) });

/** Feed do visitante: todas as cidades, sem nome nem foto de pessoas (rotas /public). */
export const fetchPublicFeed = (f: FeedFilters, offset: number) =>
  api<Paginated<PublicItem>>('/public/items', { query: feedQuery(f, offset) });

export const fetchItem = (id: string) => api<ItemDetail>(`/items/${id}`);
export const fetchPublicItem = (id: string) => api<PublicItem>(`/public/items/${id}`);

/** "Tenho interesse": só ONG ATIVO, item DISPONIVEL da mesma cidade (guia, F7.3). */
export const addInterest = (id: string) => api<Interest>(`/items/${id}/interest`, { method: 'POST' });
/** Desfazer: 204; ALREADY_SELECTED se a ONG já foi escolhida. */
export const removeInterest = (id: string) => api<void>(`/items/${id}/interest`, { method: 'DELETE' });

/** Denunciar o conteúdo do anúncio (guia, F11b). `reason` é obrigatório (10+) só na categoria OUTRO. */
export const reportItem = (id: string, category: ReportCategory, reason?: string) =>
  api<Report>(`/items/${id}/report`, { method: 'POST', json: reason ? { category, reason } : { category } });

// ── Doações (fase 4) ──

export interface NewItemInput {
  title: string;
  category: Category;
  description?: string;
  notes?: string;
  /** Exatamente 3, na ordem escolhida: a 1ª é a capa. */
  photos: File[];
}

/** Publicar (guia, F6): multipart com 3 fotos; cidade/UF ficam as do doador (padrão da API). */
export function createItem(input: NewItemInput): Promise<Item> {
  const fd = new FormData();
  fd.append('title', input.title);
  fd.append('category', input.category);
  if (input.description) fd.append('description', input.description);
  if (input.notes) fd.append('notes', input.notes);
  input.photos.forEach((photo) => fd.append('photos', photo));
  return api<Item>('/items', { method: 'POST', body: fd });
}

/** Itens por página em "Minhas doações" / "Meus interesses". */
export const MY_ITEMS_PAGE_SIZE = 12;

/** Doador: as próprias doações. ONG: os itens que curtiu (guia, F7.5 e F8.1). */
export const fetchMyItems = (status: ItemStatus | undefined, offset: number, limit = MY_ITEMS_PAGE_SIZE) =>
  api<Paginated<FeedItem>>('/items/me', { query: { status, limit, offset } });

/** ONGs interessadas (só o doador dono): ATIVO primeiro, depois pela data do like. */
export const fetchInterests = (itemId: string) => api<InterestList>(`/items/${itemId}/interests`);

/** Escolher a ONG: DISPONIVEL → EM_PROGRESSO e devolve o `chat_room_url`. */
export const selectNgo = (itemId: string, ngoId: string) =>
  api<Selection>(`/items/${itemId}/select-ngo`, { method: 'POST', json: { ngo_id: ngoId } });
