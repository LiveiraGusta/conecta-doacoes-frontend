import { ws } from 'msw';
import { WS_URL } from '@/core/api/http';
import { db } from './db';

/**
 * WebSocket falso do chat (mesmo mock nos testes e no dev:mock), seguindo a spec:
 * autentica pela sessão no handshake (ready) ou fecha com 4401; Admin fecha com 4403; ping → pong.
 * A fase 5 (chat) acrescenta os eventos (message.created, unread.updated…) e as inscrições nas salas.
 */
export const chatSocket = ws.link(WS_URL);

export const realtimeHandlers = [
  chatSocket.addEventListener('connection', ({ client }) => {
    const current = db.sessionUser();
    if (!current) return client.close(4401, 'Sessão ausente');
    if (current.user.role === 'ADMIN') return client.close(4403, 'Perfil sem chat');
    client.send(JSON.stringify({ type: 'ready', user_id: current.user.id }));

    client.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { type?: string };
        if (msg.type === 'ping') client.send(JSON.stringify({ type: 'pong' }));
      } catch {
        client.send(
          JSON.stringify({ type: 'error', error: 'VALIDATION_ERROR', message: 'Mensagem não é JSON válido.' }),
        );
      }
    });
  }),
];
