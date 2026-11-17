import { api } from '../api/http';
import type { ChatRoom, ChatSummary, Message, Paginated, Report, UnreadSummary } from '../types/api';

export type ChatStatus = 'EM_PROGRESSO' | 'DOADO';

/** Conversas por atividade mais recente (só doador e ONG). Lista curta: uma página de 50 basta. */
export const fetchChats = (status: ChatStatus) =>
  api<Paginated<ChatSummary>>('/chats', { query: { status, limit: 50, offset: 0 } });

/** Totais para o badge (V1.1); depois do boot, o WS manda `unread.updated`. */
export const fetchUnread = () => api<UnreadSummary>('/chats/unread');

/** Histórico da sala; com `after`, só o que chegou depois (polling e reconexão). */
export const fetchRoom = (itemId: string, after?: string) =>
  api<ChatRoom>(`/chats/${itemId}/messages`, { query: { after } });

export const sendMessage = (itemId: string, message: string) =>
  api<Message>(`/chats/${itemId}/messages`, { method: 'POST', json: { message } });

export const markRead = (itemId: string) => api<UnreadSummary>(`/chats/${itemId}/read`, { method: 'POST' });

/** ONG escolhida confirma que recebeu: EM_PROGRESSO → DOADO. */
export const confirmReceipt = (itemId: string) =>
  api<{ item_id: string; status: 'DOADO'; completed_at: string }>(`/items/${itemId}/confirm-receipt`, {
    method: 'POST',
  });

/** Doador ou ONG escolhida cancela: EM_PROGRESSO → DISPONIVEL. */
export const cancelNegotiation = (itemId: string, reason?: string) =>
  api<{ item_id: string; cancelled_by: 'DONOR' | 'NGO'; message: string }>(`/items/${itemId}/cancel`, {
    method: 'POST',
    json: reason ? { reason } : {},
  });

/** Denunciar a outra parte (motivo de 10 a 1000 caracteres). */
export const reportChat = (itemId: string, reason: string) =>
  api<Report>(`/chats/${itemId}/report`, { method: 'POST', json: { reason } });
