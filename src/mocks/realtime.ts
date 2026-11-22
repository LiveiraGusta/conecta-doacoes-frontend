import { ws } from 'msw';
import { WS_URL } from '@/core/api/http';
import { participation, unreadCount, unreadSummary } from './chatRules';
import { db } from './db';

/**
 * WebSocket falso do chat (mesmo mock nos testes e no dev:mock), seguindo a spec:
 * autentica pela sessão no handshake (`ready`) ou fecha com 4401; Admin fecha com 4403; ping → pong;
 * inscrição nas salas com a regra da leitura; as rotas REST falsas publicam os eventos por `realtime`.
 */
export const chatSocket = ws.link(WS_URL);

interface Connection {
  send(data: string): void;
  userId: string;
  rooms: Set<string>;
}

const connections = new Set<Connection>();
const json = (data: object) => JSON.stringify(data);

/** Publicação dos eventos (o `RealtimeBus` da API, em memória). */
export const realtime = {
  toRoom(itemId: string, event: object) {
    connections.forEach((c) => c.rooms.has(itemId) && c.send(json(event)));
  },
  toUser(userId: string, event: object) {
    connections.forEach((c) => c.userId === userId && c.send(json(event)));
  },
  /** Depois de um cancelamento: os inscritos saem da sala. */
  closeRoom(itemId: string) {
    connections.forEach((c) => {
      if (c.rooms.delete(itemId)) c.send(json({ type: 'unsubscribed', item_id: itemId, reason: 'chat_closed' }));
    });
  },
  /** `unread.updated` para todas as conexões do usuário (V1.1). */
  unread(userId: string, itemId: string) {
    const item = db.state.items.get(itemId);
    realtime.toUser(userId, {
      type: 'unread.updated',
      item_id: itemId,
      unread_count: item ? unreadCount(item, userId) : 0,
      ...unreadSummary(userId),
    });
  },
};

const UUID = /^[0-9a-f-]{36}$/i;

export const realtimeHandlers = [
  chatSocket.addEventListener('connection', ({ client }) => {
    const current = db.sessionUser();
    if (!current) return client.close(4401, 'Sessão ausente');
    if (current.user.role === 'ADMIN') return client.close(4403, 'Perfil sem chat');

    const conn: Connection = { send: (d) => client.send(d), userId: current.user.id, rooms: new Set() };
    connections.add(conn);
    client.addEventListener('close', () => connections.delete(conn));
    client.send(json({ type: 'ready', user_id: conn.userId }));

    client.addEventListener('message', (event) => {
      let msg: { type?: string; item_id?: string };
      try {
        msg = JSON.parse(String(event.data)) as typeof msg;
      } catch {
        return client.send(json({ type: 'error', error: 'VALIDATION_ERROR', message: 'Mensagem não é JSON válido.' }));
      }
      if (msg.type === 'ping') return client.send(json({ type: 'pong' }));
      if (msg.type !== 'subscribe' && msg.type !== 'unsubscribe') {
        return client.send(
          json({ type: 'error', error: 'VALIDATION_ERROR', message: 'Tipo de mensagem desconhecido.' }),
        );
      }
      const itemId = msg.item_id ?? '';
      if (!UUID.test(itemId)) {
        return client.send(json({ type: 'error', error: 'VALIDATION_ERROR', message: 'item_id inválido.' }));
      }
      if (msg.type === 'unsubscribe') {
        conn.rooms.delete(itemId);
        return client.send(json({ type: 'unsubscribed', item_id: itemId, reason: 'requested' }));
      }
      const access = participation(itemId, conn.userId);
      if ('error' in access) {
        return client.send(
          json({ type: 'error', error: access.error.code, message: access.error.message, item_id: itemId }),
        );
      }
      conn.rooms.add(itemId);
      client.send(json({ type: 'subscribed', item_id: itemId }));
    });
  }),
];
