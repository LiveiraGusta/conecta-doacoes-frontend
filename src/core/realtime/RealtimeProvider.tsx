import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { notifyUnauthorized } from '../api/http';
import { RealtimeClient, type RealtimeStatus, type ServerEvent } from '../api/realtime';
import { useAuth } from '../auth/useAuth';
import { useSnackbar } from '../feedback/useSnackbar';
import { addMessageToCache, chatKey, chatsKey, markRoomRead, UNREAD_KEY, type ChatRoomView } from '../hooks/useChats';
import { fetchChats } from '../services/chats';
import type { ChatSummary, Paginated, UnreadSummary } from '../types/api';
import { playNotificationSound } from '../utils/sound';
import { RealtimeContext, type RealtimeContextValue } from './realtimeContext';

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/**
 * Tempo real do chat (plano, "Pontos-chave do core"): um WebSocket por sessão de doador ou ONG, e os eventos
 * viram mudanças no cache do TanStack Query.
 * - `message.created` (sala aberta): entra no histórico sem repetir e, com a aba visível, fica lida;
 * - `unread.updated` (todas as conversas): badge, lista e, se o contador subiu fora da sala aberta,
 *   snackbar "Nova mensagem de X" com "Abrir" e um som curto;
 * - `item.status_changed`: sala só leitura (DOADO) ou encerrada (DISPONIVEL), listas recarregadas e aviso
 *   quando foi a outra parte;
 * - reconectou: busca o que perdeu (`?after=`) recarregando salas, lista e badge.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const [client] = useState(() => new RealtimeClient({ onUnauthorized: () => notifyUnauthorized('/chats/ws') }));
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const activeRoom = useRef<string | null>(null);

  const userId = user?.id;
  const role = user?.role;
  const canChat = role === 'DONOR' || role === 'NGO';

  useEffect(() => client.onStatus(setStatus), [client]);

  useEffect(() => {
    if (!canChat || !userId) return;
    client.connect();
    return () => client.disconnect();
  }, [client, canChat, userId]);

  // Voltou a conectar depois de cair: recupera o que perdeu.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (status === 'open' && wasOpen.current) {
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    }
    if (status === 'open') wasOpen.current = true;
  }, [status, queryClient]);

  /** Último contador visto por conversa (para saber se subiu). */
  const lastUnread = useRef(new Map<string, number>());
  const listUnread = useCallback(
    (itemId: string) =>
      queryClient
        .getQueriesData<Paginated<ChatSummary>>({ queryKey: ['chats'] })
        .flatMap(([, list]) => list?.data ?? [])
        .find((c) => c.item_id === itemId)?.unread_count,
    [queryClient],
  );

  /** Título do item e nome da outra parte, de onde estiver no cache (sala aberta ou lista). */
  const lookup = useCallback(
    (itemId: string) => {
      const room = queryClient.getQueryData<ChatRoomView>(chatKey(itemId));
      if (room) return { title: room.item.title, name: room.counterpart.name };
      const summary = queryClient
        .getQueriesData<Paginated<ChatSummary>>({ queryKey: ['chats'] })
        .flatMap(([, list]) => list?.data ?? [])
        .find((c) => c.item_id === itemId);
      return { title: summary?.item_title, name: summary?.counterpart.name };
    },
    [queryClient],
  );

  const handle = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case 'message.created':
          // Só chega das salas inscritas (a aberta): entra no histórico e, com a aba visível, já fica lida.
          addMessageToCache(queryClient, event.message);
          void queryClient.invalidateQueries({ queryKey: ['chats'] });
          if (event.message.sender_id !== userId && activeRoom.current === event.item_id && visible()) {
            void markRoomRead(queryClient, event.item_id);
          }
          return;
        case 'unread.updated': {
          // Chega de todas as conversas: o contador da conversa subir é mensagem nova da outra parte.
          const before = lastUnread.current.get(event.item_id) ?? listUnread(event.item_id) ?? 0;
          lastUnread.current.set(event.item_id, event.unread_count);
          queryClient.setQueryData<UnreadSummary>(UNREAD_KEY, {
            unread_messages: event.unread_messages,
            unread_chats: event.unread_chats,
          });
          queryClient.setQueriesData<Paginated<ChatSummary>>(
            { queryKey: ['chats'] },
            (list) =>
              list && {
                ...list,
                data: list.data.map((c) =>
                  c.item_id === event.item_id ? { ...c, unread_count: event.unread_count } : c,
                ),
              },
          );
          void queryClient.invalidateQueries({ queryKey: ['chats'] });
          const watching = activeRoom.current === event.item_id && visible();
          if (event.unread_count > before && !watching) {
            playNotificationSound();
            // Fora da tela de conversas a lista não está no cache: busca para mostrar o nome de quem mandou.
            void queryClient
              .ensureQueryData({ queryKey: chatsKey('EM_PROGRESSO'), queryFn: () => fetchChats('EM_PROGRESSO') })
              .catch(() => null)
              .then(() => {
                const { name } = lookup(event.item_id);
                snackbar.show({
                  message: name ? t('notify.newMessage', { name }) : t('notify.newMessageGeneric'),
                  action: { label: t('notify.open'), onClick: () => navigate(`/chats/${event.item_id}`) },
                });
              });
          }
          return;
        }
        case 'item.status_changed': {
          const title = lookup(event.item_id).title ?? t('notify.itemFallback');
          queryClient.setQueryData<ChatRoomView>(chatKey(event.item_id), (room) => {
            if (!room) return room;
            return event.status === 'DOADO'
              ? { ...room, item: { ...room.item, status: 'DOADO' } }
              : { ...room, closed: true };
          });
          for (const key of [['chats'], ['myItems'], ['item'], ['feed'], ['interests']]) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
          if (event.changed_by !== role) {
            snackbar.show({
              message: t(event.status === 'DOADO' ? 'notify.donated' : 'notify.cancelled', { title }),
              variant: event.status === 'DOADO' ? 'success' : 'info',
            });
          }
          return;
        }
        default:
      }
    },
    [queryClient, userId, role, snackbar, navigate, t, lookup, listUnread],
  );

  useEffect(() => client.on(handle), [client, handle]);

  // Voltou para a aba com a sala aberta: marca como lida.
  useEffect(() => {
    const onVisible = () => {
      if (visible() && activeRoom.current) void markRoomRead(queryClient, activeRoom.current);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [queryClient]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      connected: status === 'open',
      subscribe: (id) => client.subscribe(id),
      unsubscribe: (id) => client.unsubscribe(id),
      setActiveRoom: (id) => {
        activeRoom.current = id;
      },
    }),
    [client, status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
