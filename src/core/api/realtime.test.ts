import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient, type RealtimeStatus } from './realtime';

/** WebSocket falso: guarda o que o cliente envia e deixa o teste abrir, mandar eventos e fechar. */
class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  /** O servidor aceitou: manda `ready`. */
  ready() {
    this.readyState = FakeSocket.OPEN;
    this.emit({ type: 'ready', user_id: 'u1' });
  }
  emit(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
  /** Caiu (rede, deploy). */
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const last = () => FakeSocket.instances.at(-1)!;

describe('RealtimeClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup(onUnauthorized = vi.fn()) {
    const client = new RealtimeClient({ url: 'ws://teste/chats/ws', onUnauthorized });
    const statuses: RealtimeStatus[] = [];
    client.onStatus((s) => statuses.push(s));
    const events: { type: string }[] = [];
    client.on((e) => events.push(e));
    return { client, statuses, events, onUnauthorized };
  }

  it('só fica "open" depois do ready; salas pedidas antes são inscritas ao chegar o ready', () => {
    const { client, statuses, events } = setup();
    client.subscribe('sala-1');
    client.connect();
    expect(statuses).toEqual(['connecting']);
    expect(last().sent).toEqual([]);
    last().ready();
    expect(statuses).toEqual(['connecting', 'open']);
    expect(last().sent).toEqual([{ type: 'subscribe', item_id: 'sala-1' }]);
    client.subscribe('sala-2');
    client.unsubscribe('sala-1');
    expect(last().sent.slice(1)).toEqual([
      { type: 'subscribe', item_id: 'sala-2' },
      { type: 'unsubscribe', item_id: 'sala-1' },
    ]);
    last().emit({ type: 'message.created', item_id: 'sala-2', message: {} });
    expect(events.map((e) => e.type)).toEqual(['ready', 'message.created']);
  });

  it('caiu: reconecta com espera crescente (1 s, 2 s…) e inscreve de novo as salas', () => {
    const { client, statuses } = setup();
    client.connect();
    last().ready();
    client.subscribe('sala-1');

    last().drop();
    expect(statuses.at(-1)).toBe('closed');
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(2);
    last().drop(); // falhou de novo antes do ready
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);
    last().ready();
    expect(statuses.at(-1)).toBe('open');
    expect(last().sent).toEqual([{ type: 'subscribe', item_id: 'sala-1' }]);
    // Depois de conectar, a contagem volta ao começo.
    last().drop();
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(4);
  });

  it('4401: avisa a sessão expirada e não tenta de novo; 4403 também não', () => {
    const first = setup();
    first.client.connect();
    last().drop(4401);
    vi.advanceTimersByTime(60_000);
    expect(first.onUnauthorized).toHaveBeenCalledOnce();
    expect(FakeSocket.instances).toHaveLength(1);

    const second = setup();
    second.client.connect();
    last().drop(4403);
    vi.advanceTimersByTime(60_000);
    expect(second.onUnauthorized).not.toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it('chat_closed tira a sala da lista; disconnect fecha sem reconectar', () => {
    const { client } = setup();
    client.subscribe('sala-1');
    client.connect();
    last().ready();
    last().emit({ type: 'unsubscribed', item_id: 'sala-1', reason: 'chat_closed' });
    last().drop();
    vi.advanceTimersByTime(1000);
    last().ready();
    expect(last().sent).toEqual([]);

    client.disconnect();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(client.status).toBe('closed');
  });
});
