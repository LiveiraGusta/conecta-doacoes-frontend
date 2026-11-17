import type { FeedCardItem } from '@/core/hooks/useFeed';
import type { User } from '@/core/types/api';

export type InterestItem = Pick<FeedCardItem, 'id' | 'status' | 'has_user_interest' | 'is_selected'>;

/** O que mostrar no lugar do botão (decisão da fase 3: "Em negociação" sem botão). */
export type InterestView = 'login' | 'add' | 'remove' | 'selected' | 'received' | 'inProgress' | 'donated' | 'none';

export function interestView(item: InterestItem, user: User | null): InterestView {
  // DOADO só aparece em "Meus interesses" da ONG (o feed não mostra itens doados).
  if (item.is_selected) return item.status === 'DOADO' ? 'received' : 'selected';
  if (item.status === 'DOADO') return 'donated';
  if (item.status !== 'DISPONIVEL') return 'inProgress';
  if (!user) return 'login';
  // Só ONG aprovada demonstra interesse; doador, admin e ONG em análise só olham (o banner explica).
  if (user.role !== 'NGO' || user.ngo_profile?.status !== 'ATIVO') return 'none';
  return item.has_user_interest ? 'remove' : 'add';
}
