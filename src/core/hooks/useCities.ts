import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchCities, normalizeText } from '../services/ibge';
import type { UF } from '../types/api';

/**
 * Municípios da UF (IBGE) e a checagem da cidade digitada:
 * - `canonical("sao paulo")` → "São Paulo" (grafia oficial, igual para todo mundo, para o feed casar);
 * - `null` → a lista carregou e a cidade não está nela (erro no campo);
 * - `undefined` → sem lista (IBGE fora do ar ou sem rede): aceita o que foi digitado.
 */
export function useCities(state: string | undefined) {
  const query = useQuery({
    queryKey: ['ibge', 'cities', state],
    queryFn: () => fetchCities(state as UF),
    enabled: Boolean(state),
    staleTime: Infinity,
    retry: 1,
  });

  const canonical = useCallback(
    (city: string): string | null | undefined => {
      if (!query.data) return undefined;
      const wanted = normalizeText(city);
      return query.data.find((c) => normalizeText(c) === wanted) ?? null;
    },
    [query.data],
  );

  return { cities: query.data ?? [], isError: query.isError, isLoading: query.isFetching, canonical };
}
