import type { Message, UnreadSummary } from '@/core/types/api';
import { db } from './db';
import type { MockItem } from './items';

/** Regras do chat compartilhadas pelas rotas REST falsas e pelo WebSocket falso (iguais às da API). */

export interface RuleError {
  status: number;
  code: string;
  message: string;
}

const inChat = (i: MockItem) => i.status === 'EM_PROGRESSO' || i.status === 'DOADO';
export const isParticipant = (item: MockItem, userId: string) =>
  item.donor_id === userId || item.selected_ngo_id === userId;
export const counterpartId = (item: MockItem, userId: string) =>
  item.donor_id === userId ? item.selected_ngo_id! : item.donor_id;

/**
 * Mesma regra de GET /chats/:itemId/messages: 404 se não existe; item DISPONIVEL → o doador recebe
 * CHAT_CLOSED e os demais 403; quem não é o doador nem a ONG escolhida → 403.
 */
export function participation(itemId: string, userId: string): { item: MockItem } | { error: RuleError } {
  const item = db.state.items.get(itemId);
  if (!item) return { error: { status: 404, code: 'ITEM_NOT_FOUND', message: 'Item não encontrado.' } };
  if (item.status === 'DISPONIVEL') {
    return item.donor_id === userId
      ? { error: { status: 409, code: 'CHAT_CLOSED', message: 'Esta negociação foi encerrada.' } }
      : { error: { status: 403, code: 'FORBIDDEN', message: 'Você não tem permissão para esta ação.' } };
  }
  if (!isParticipant(item, userId)) {
    return { error: { status: 403, code: 'FORBIDDEN', message: 'Você não participa desta negociação.' } };
  }
  return { item };
}

/** Mensagens do par atual (doador + ONG escolhida), em ordem; `after` exclusivo. */
export function pairMessages(item: MockItem, after?: string): Message[] {
  const pair = new Set([item.donor_id, item.selected_ngo_id]);
  return db.state.messages
    .filter((m) => m.item_id === item.id && pair.has(m.sender_id) && pair.has(m.receiver_id))
    .filter((m) => !after || m.created_at > after)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Não lidas: recebidas da contraparte atual depois da última leitura. */
export function unreadCount(item: MockItem, userId: string): number {
  if (!item.selected_ngo_id) return 0;
  const lastRead = db.state.reads.get(`${item.id}:${userId}`) ?? '';
  const from = counterpartId(item, userId);
  return pairMessages(item).filter((m) => m.receiver_id === userId && m.sender_id === from && m.created_at > lastRead)
    .length;
}

/** Conversas do usuário (doador ou ONG escolhida, itens EM_PROGRESSO ou DOADO). */
export const chatItemsOf = (userId: string) =>
  [...db.state.items.values()].filter((i) => inChat(i) && isParticipant(i, userId));

export function unreadSummary(userId: string): UnreadSummary {
  const counts = chatItemsOf(userId).map((i) => unreadCount(i, userId));
  return { unread_messages: counts.reduce((a, b) => a + b, 0), unread_chats: counts.filter((n) => n > 0).length };
}

export function markRead(itemId: string, userId: string) {
  db.state.reads.set(`${itemId}:${userId}`, new Date().toISOString());
}
