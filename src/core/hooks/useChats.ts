import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { useRealtime } from '../realtime/realtimeContext';
import { fetchChats, fetchRoom, fetchUnread, markRead, type ChatStatus } from '../services/chats';
import type { ChatRoom, ChatSummary, Message, Paginated, UnreadSummary } from '../types/api';

export const chatsKey = (status: ChatStatus) => ['chats', status] as const;
export const UNREAD_KEY = ['unread'] as const;
export const chatKey = (itemId: string) => ['chat', itemId] as const;

/** Sala como fica no cache: `closed` quando a negociação foi cancelada com a sala aberta. */
export interface ChatRoomView extends ChatRoom {
  closed: boolean;
}

/** Junta mensagens sem repetir (o POST e o WebSocket podem trazer a mesma), em ordem de envio. */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  incoming.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Acrescenta uma mensagem na sala aberta no cache (se houver). */
export function addMessageToCache(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<ChatRoomView>(
    chatKey(message.item_id),
    (room) => room && { ...room, messages: mergeMessages(room.messages, [message]) },
  );
}

/** Marca a sala como lida e atualiza o badge e o contador da conversa na lista. */
export async function markRoomRead(queryClient: QueryClient, itemId: string) {
  try {
    const summary = await markRead(itemId);
    queryClient.setQueryData<UnreadSummary>(UNREAD_KEY, summary);
    queryClient.setQueriesData<Paginated<ChatSummary>>(
      { queryKey: ['chats'] },
      (list) => list && { ...list, data: list.data.map((c) => (c.item_id === itemId ? { ...c, unread_count: 0 } : c)) },
    );
  } catch {
    // Sem rede ou sala fechada: o badge se acerta no próximo unread.updated ou polling.
  }
}

const canChat = (role?: string) => role === 'DONOR' || role === 'NGO';

/** Lista de conversas por aba (Em andamento / Concluídas). */
export function useChats(status: ChatStatus) {
  const { user } = useAuth();
  return useQuery({ queryKey: chatsKey(status), queryFn: () => fetchChats(status), enabled: canChat(user?.role) });
}

/** Não lidas para o badge: busca no boot; depois o WebSocket atualiza (ou polling de 15 s sem ele). */
export function useUnreadCount(): number {
  const { user } = useAuth();
  const { connected } = useRealtime();
  const query = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: fetchUnread,
    enabled: canChat(user?.role),
    refetchInterval: connected ? false : 15_000,
  });
  return canChat(user?.role) ? (query.data?.unread_messages ?? 0) : 0;
}

/** Só lê o badge do cache, sem buscar (título da aba, usado fora da sessão também). */
export function useCachedUnread(): number {
  return useQuery({ queryKey: UNREAD_KEY, queryFn: fetchUnread, enabled: false }).data?.unread_messages ?? 0;
}

/** Intervalo do polling da sala quando o WebSocket não está conectado (guia, §5). */
export const ROOM_POLL_MS = 3000;

/**
 * Sala de conversa: histórico na primeira vez; depois só o que chegou (`?after=`), juntado sem repetir.
 * Sem WebSocket, faz polling de 3 s; para quando a doação foi concluída ou a negociação cancelada.
 */
export function useChatRoom(itemId: string) {
  const queryClient = useQueryClient();
  const { connected } = useRealtime();
  return useQuery({
    queryKey: chatKey(itemId),
    enabled: Boolean(itemId),
    staleTime: 0,
    queryFn: async (): Promise<ChatRoomView> => {
      const prev = queryClient.getQueryData<ChatRoomView>(chatKey(itemId));
      const last = prev?.messages.at(-1)?.created_at;
      const room = await fetchRoom(itemId, last);
      return { ...room, closed: false, messages: prev ? mergeMessages(prev.messages, room.messages) : room.messages };
    },
    refetchInterval: (q) => {
      const data = q.state.data;
      if (connected || q.state.error || data?.closed || data?.item.status === 'DOADO') return false;
      return ROOM_POLL_MS;
    },
  });
}
