import { WS_URL } from './http';
import type { Message } from '../types/api';

/** Eventos do servidor (Spec do Chat em Tempo Real). */
export type ServerEvent =
  | { type: 'ready'; user_id: string }
  | { type: 'subscribed'; item_id: string }
  | { type: 'unsubscribed'; item_id: string; reason: 'requested' | 'chat_closed' }
  | { type: 'pong' }
  | { type: 'message.created'; item_id: string; message: Message }
  | {
      type: 'item.status_changed';
      item_id: string;
      previous_status: string;
      status: 'DOADO' | 'DISPONIVEL';
      changed_by: 'DONOR' | 'NGO';
      reason: string | null;
      completed_at: string | null;
    }
  | { type: 'unread.updated'; item_id: string; unread_count: number; unread_messages: number; unread_chats: number }
  | { type: 'error'; error: string; message: string; item_id?: string };

/** `open` só depois do `ready` (autenticado pelo cookie no handshake). */
export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed';

/** Espera entre tentativas de reconexão (spec: 1 s, 2 s, 5 s, 10 s; depois fica em 10 s). */
export const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];

export interface RealtimeOptions {
  url?: string;
  delays?: number[];
  /** Fechou com 4401: sessão expirada (mesmo fluxo do 401 do REST). */
  onUnauthorized?(): void;
}

/**
 * Cliente do WebSocket do chat (guia, §5, sem a mensagem `auth`: o cookie vai no handshake).
 * - inscreve de novo as salas a cada `ready` (reconexão);
 * - reconecta com backoff, menos em 4401 (sessão) e 4403 (Admin/Origin), que não adiantam tentar de novo;
 * - quem usa ouve os eventos (`on`) e o estado (`onStatus`) e liga o polling quando não está `open`.
 */
export class RealtimeClient {
  status: RealtimeStatus = 'idle';
  private ws: WebSocket | null = null;
  private readonly rooms = new Set<string>();
  private readonly listeners = new Set<(event: ServerEvent) => void>();
  private readonly statusListeners = new Set<(status: RealtimeStatus) => void>();
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = true;

  constructor(private readonly options: RealtimeOptions = {}) {}

  connect() {
    if (!this.stopped) return;
    this.stopped = false;
    this.open();
  }

  disconnect() {
    this.stopped = true;
    clearTimeout(this.timer);
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000);
    this.setStatus('closed');
  }

  subscribe(itemId: string) {
    this.rooms.add(itemId);
    this.send({ type: 'subscribe', item_id: itemId });
  }

  unsubscribe(itemId: string) {
    if (!this.rooms.delete(itemId)) return;
    this.send({ type: 'unsubscribe', item_id: itemId });
  }

  on(listener: (event: ServerEvent) => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  onStatus(listener: (status: RealtimeStatus) => void) {
    this.statusListeners.add(listener);
    return () => void this.statusListeners.delete(listener);
  }

  private send(payload: object) {
    // Antes do `ready` não manda nada: as salas guardadas são inscritas quando ele chegar.
    if (this.status === 'open' && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private open() {
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.options.url ?? WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onmessage = (raw) => {
      let event: ServerEvent;
      try {
        event = JSON.parse(String(raw.data)) as ServerEvent;
      } catch {
        return;
      }
      if (event.type === 'ready') {
        this.attempt = 0;
        this.setStatus('open');
        this.rooms.forEach((id) => this.send({ type: 'subscribe', item_id: id }));
      }
      if (event.type === 'unsubscribed' && event.reason === 'chat_closed') this.rooms.delete(event.item_id);
      this.listeners.forEach((l) => l(event));
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return; // conexão antiga (já trocada ou encerrada por nós)
      this.ws = null;
      if (this.stopped) return this.setStatus('closed');
      if (event.code === 4401) {
        this.stopped = true;
        this.setStatus('closed');
        this.options.onUnauthorized?.();
        return;
      }
      if (event.code === 4403) {
        this.stopped = true;
        return this.setStatus('closed');
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    this.setStatus('closed');
    const delays = this.options.delays ?? RECONNECT_DELAYS;
    const delay = delays[Math.min(this.attempt, delays.length - 1)]!;
    this.attempt++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.stopped) this.open();
    }, delay);
  }
}
