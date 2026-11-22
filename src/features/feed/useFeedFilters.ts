import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { FeedFilters } from '@/core/services/items';
import type { Category } from '@/core/types/api';
import { CATEGORIES } from './categories';

/** Na URL em português e minúsculas: `?categoria=roupas&busca=jeans` (decisão da fase 3: dá para compartilhar). */
const CATEGORY_PARAM = 'categoria';
const SEARCH_PARAM = 'busca';

export function parseCategory(raw: string | null): Category | undefined {
  const upper = raw?.toUpperCase();
  return CATEGORIES.find((c) => c === upper);
}

/**
 * Filtros do feed lidos e gravados na URL. Valor desconhecido na URL é ignorado (não quebra o feed).
 * `source`: a query string de outra URL (o feed por trás do modal de detalhe, que está em /items/:id).
 */
export function useFeedFilters(source?: string) {
  const [current, setParams] = useSearchParams();
  const params = source === undefined ? current : new URLSearchParams(source);
  const category = parseCategory(params.get(CATEGORY_PARAM));
  const search = params.get(SEARCH_PARAM)?.trim() ?? '';

  const filters = useMemo<FeedFilters>(() => ({ category, search: search || undefined }), [category, search]);

  const update = useCallback(
    (patch: { category?: Category | null; search?: string }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.category !== undefined) {
            if (patch.category) next.set(CATEGORY_PARAM, patch.category.toLowerCase());
            else next.delete(CATEGORY_PARAM);
          }
          if (patch.search !== undefined) {
            const s = patch.search.trim();
            if (s) next.set(SEARCH_PARAM, s);
            else next.delete(SEARCH_PARAM);
          }
          return next;
        },
        // Digitar na busca não enche o histórico; trocar categoria também não.
        { replace: true },
      );
    },
    [setParams],
  );

  const clear = useCallback(() => update({ category: null, search: '' }), [update]);

  return { filters, category: category ?? null, search, update, clear, hasFilters: Boolean(category || search) };
}
