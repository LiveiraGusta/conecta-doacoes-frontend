import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { fetchPublicUser, fetchUserDonations, fetchUserProfile, USER_DONATIONS_PAGE } from '../services/profile';
import type { Address, Category, NgoStatus, UF } from '../types/api';
import { fromFeedItem, type FeedCardItem } from './useFeed';

/**
 * Página pessoal igual para logado e visitante (decisão da 0.2b-3): o visitante não vê nome, foto, banner,
 * endereço nem contatos, então esses campos vêm `null` e `isPublic` é true.
 */
export interface UserPageView {
  id: string;
  role: 'DONOR' | 'NGO';
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string;
  state: UF;
  member_since: string | null;
  donations_count: number | null;
  ngo: {
    status: NgoStatus | null;
    website: string | null;
    banner_url: string | null;
    accepted_categories: Category[];
    phone: string | null;
    instagram: string | null;
    address: Address | null;
  } | null;
  isPublic: boolean;
}

export const userPageKey = (mode: 'auth' | 'public', id: string) => ['userPage', mode, id] as const;

export function useUserPage(id: string) {
  const { status } = useAuth();
  const mode = status === 'authenticated' ? 'auth' : 'public';
  return useQuery({
    queryKey: userPageKey(mode, id),
    enabled: status !== 'loading' && Boolean(id),
    queryFn: async (): Promise<UserPageView> => {
      if (mode === 'auth') {
        const p = await fetchUserProfile(id);
        return { ...p, ngo: p.ngo ?? null, isPublic: false } as UserPageView;
      }
      const p = await fetchPublicUser(id);
      return {
        id: p.id,
        role: p.role,
        name: null,
        avatar_url: null,
        bio: p.bio,
        city: p.city,
        state: p.state,
        member_since: null,
        donations_count: p.donations_count,
        ngo:
          p.role === 'NGO'
            ? {
                status: null,
                website: null,
                banner_url: null,
                accepted_categories: p.accepted_categories,
                phone: null,
                instagram: null,
                address: null,
              }
            : null,
        isPublic: true,
      };
    },
  });
}

type Page = { total: number; data: FeedCardItem[]; hidden: boolean };

/** Doações concluídas (doador) ou recebidas (ONG), só para quem está logado; `hidden` = o doador escolheu ocultar. */
export function useUserDonations(id: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['userDonations', id],
    enabled: enabled && Boolean(id),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const res = await fetchUserDonations(id, pageParam);
      return { total: res.total, hidden: res.hidden, data: res.data.map(fromFeedItem) };
    },
    getNextPageParam: (last, pages) => {
      const loaded = (pages.length - 1) * USER_DONATIONS_PAGE + last.data.length;
      return loaded < last.total ? pages.length * USER_DONATIONS_PAGE : undefined;
    },
    select: (data: InfiniteData<Page>) => ({
      items: data.pages.flatMap((p) => p.data),
      total: data.pages[0]?.total ?? 0,
      hidden: data.pages[0]?.hidden ?? false,
    }),
  });
}
