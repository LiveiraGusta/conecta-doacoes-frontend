import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { fetchFeed, fetchPublicFeed, FEED_PAGE_SIZE, type FeedFilters } from '../services/items';
import type { Category, FeedItem, ItemStatus, Paginated, PublicItem } from '../types/api';

/**
 * O que o card precisa, igual para logado e visitante. No visitante não há doador nem contexto
 * (decisão da 0.2b-3: sem nome nem foto de pessoas).
 */
export interface FeedCardItem {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  city: string;
  state: string;
  status: ItemStatus;
  created_at: string;
  photos: string[];
  donor: { id: string; name: string; avatar_url: string | null } | null;
  has_user_interest: boolean;
  interests_count: number | null;
  is_selected: boolean;
}

export const fromFeedItem = (i: FeedItem): FeedCardItem => ({
  id: i.id!,
  title: i.title!,
  description: i.description ?? null,
  category: i.category!,
  city: i.city!,
  state: i.state!,
  status: i.status!,
  created_at: i.created_at!,
  photos: i.photos ?? [],
  donor: i.donor ? { id: i.donor.id!, name: i.donor.name!, avatar_url: i.donor.avatar_url ?? null } : null,
  has_user_interest: i.has_user_interest ?? false,
  interests_count: i.interests_count ?? 0,
  is_selected: i.is_selected ?? false,
});

export const fromPublicItem = (i: PublicItem): FeedCardItem => ({
  ...i,
  donor: null,
  has_user_interest: false,
  interests_count: null,
  is_selected: false,
});

export type FeedMode = 'auth' | 'public';
type Page = Paginated<FeedCardItem>;

/** Chaves separadas por modo (plano, "Cuidados"): o cache do visitante não vaza para o logado. */
export const feedKey = (mode: FeedMode, filters: FeedFilters) =>
  ['feed', mode, filters.category ?? null, filters.search?.trim() || null] as const;

/**
 * Feed com scroll infinito (useInfiniteQuery). Logado: a cidade do usuário; visitante: todas.
 * Itens novos deslocam o offset: a lista junta as páginas e tira repetidos pelo id.
 */
export function useFeed(filters: FeedFilters) {
  const { status, user } = useAuth();
  // Admin não tem feed próprio (a API responde 403): vê o feed de visitante.
  const mode: FeedMode = user && user.role !== 'ADMIN' ? 'auth' : 'public';

  const query = useInfiniteQuery({
    queryKey: feedKey(mode, filters),
    enabled: status !== 'loading',
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page> => {
      if (mode === 'auth') {
        const res = await fetchFeed(filters, pageParam);
        return { total: res.total, data: res.data.map(fromFeedItem) };
      }
      const res = await fetchPublicFeed(filters, pageParam);
      return { total: res.total, data: res.data.map(fromPublicItem) };
    },
    getNextPageParam: (last, pages) => {
      const offset = (pages.length - 1) * FEED_PAGE_SIZE + last.data.length;
      return offset < last.total ? pages.length * FEED_PAGE_SIZE : undefined;
    },
    select: (data: InfiniteData<Page>) => {
      const seen = new Set<string>();
      const items = data.pages.flatMap((p) => p.data).filter((i) => !seen.has(i.id) && seen.add(i.id));
      return { items, total: data.pages[0]?.total ?? 0 };
    },
  });

  return { ...query, mode };
}
