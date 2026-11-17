import { api } from '../api/http';
import type { Category, FeedItem, Interest, ItemDetail, Paginated, PublicItem } from '../types/api';

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
