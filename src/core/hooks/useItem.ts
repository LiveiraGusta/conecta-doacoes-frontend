import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { fetchItem, fetchPublicItem } from '../services/items';
import type { Category, ItemStatus } from '../types/api';

/** Detalhe do item, igual para logado e visitante (o visitante não vê doador, observações nem contagem). */
export interface ItemView {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
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
  donor_id: string | null;
  /** ONG escolhida (só logado; o doador usa na lista de interessadas). */
  selected_ngo_id: string | null;
}

export const itemKey = (mode: 'auth' | 'public', id: string) => ['item', mode, id] as const;

export function useItem(id: string) {
  const { status } = useAuth();
  const mode = status === 'authenticated' ? 'auth' : 'public';
  return useQuery({
    queryKey: itemKey(mode, id),
    enabled: status !== 'loading' && Boolean(id),
    queryFn: async (): Promise<ItemView> => {
      if (mode === 'auth') {
        const d = await fetchItem(id);
        return {
          id: d.id,
          title: d.title,
          description: d.description ?? null,
          notes: d.notes ?? null,
          category: d.category,
          city: d.city,
          state: d.state,
          status: d.status,
          created_at: d.created_at,
          photos: d.photos.map((p) => p.photo_url),
          donor: d.donor ? { id: d.donor.id!, name: d.donor.name!, avatar_url: d.donor.avatar_url ?? null } : null,
          has_user_interest: d.has_user_interest ?? false,
          interests_count: d.interests_count ?? 0,
          is_selected: d.is_selected ?? false,
          donor_id: d.donor_id,
          selected_ngo_id: d.selected_ngo_id ?? null,
        };
      }
      const p = await fetchPublicItem(id);
      return {
        ...p,
        notes: null,
        donor: null,
        has_user_interest: false,
        interests_count: null,
        is_selected: false,
        donor_id: null,
        selected_ngo_id: null,
      };
    },
  });
}
