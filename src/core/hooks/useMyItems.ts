import { useInfiniteQuery, useQueries, useQuery, type InfiniteData } from '@tanstack/react-query';
import { fetchInterests, fetchMyItems, MY_ITEMS_PAGE_SIZE } from '../services/items';
import type { ItemStatus, Paginated } from '../types/api';
import { fromFeedItem, type FeedCardItem } from './useFeed';

type Page = Paginated<FeedCardItem>;

/** Abas de status de "Minhas doações" / "Meus interesses" (`undefined` = Todas). */
export const MY_ITEMS_TABS: (ItemStatus | undefined)[] = [undefined, 'DISPONIVEL', 'EM_PROGRESSO', 'DOADO'];

/** Tudo de "minhas" fica sob `['myItems']`: publicar, escolher ONG ou mexer no interesse invalida de uma vez. */
export const myItemsKey = (status?: ItemStatus) => ['myItems', 'list', status ?? 'all'] as const;
const myItemsCountKey = (status?: ItemStatus) => ['myItems', 'count', status ?? 'all'] as const;

/** Doador: as próprias doações; ONG: os itens que curtiu. Scroll infinito como o feed, sem repetidos. */
export function useMyItems(status?: ItemStatus) {
  return useInfiniteQuery({
    queryKey: myItemsKey(status),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const res = await fetchMyItems(status, pageParam);
      return { total: res.total, data: res.data.map(fromFeedItem) };
    },
    getNextPageParam: (last, pages) => {
      const loaded = (pages.length - 1) * MY_ITEMS_PAGE_SIZE + last.data.length;
      return loaded < last.total ? pages.length * MY_ITEMS_PAGE_SIZE : undefined;
    },
    select: (data: InfiniteData<Page>) => {
      const seen = new Set<string>();
      const items = data.pages.flatMap((p) => p.data).filter((i) => !seen.has(i.id) && seen.add(i.id));
      return { items, total: data.pages[0]?.total ?? 0 };
    },
  });
}

/**
 * Número de cada aba. A API não tem contagem por status: uma consulta de 1 item por aba basta (`total`).
 * Devolve `undefined` na aba que ainda está carregando.
 */
export function useMyItemCounts() {
  return useQueries({
    queries: MY_ITEMS_TABS.map((status) => ({
      queryKey: myItemsCountKey(status),
      queryFn: () => fetchMyItems(status, 0, 1),
      select: (res: Paginated<unknown>) => res.total,
    })),
    combine: (results) => results.map((r) => r.data),
  });
}

export const interestsKey = (itemId: string) => ['interests', itemId] as const;

/** ONGs interessadas num item do doador (guia, F8). */
export function useInterests(itemId: string) {
  return useQuery({ queryKey: interestsKey(itemId), queryFn: () => fetchInterests(itemId), enabled: Boolean(itemId) });
}
