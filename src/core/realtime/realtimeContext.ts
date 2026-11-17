import { createContext, useContext } from 'react';
import type { RealtimeStatus } from '../api/realtime';

export interface RealtimeContextValue {
  status: RealtimeStatus;
  /** WebSocket autenticado (`ready`). Sem ele, a sala faz polling de 3 s. */
  connected: boolean;
  subscribe(itemId: string): void;
  unsubscribe(itemId: string): void;
  /** Sala aberta na tela: não avisa mensagem dela e marca como lida enquanto a aba está visível. */
  setActiveRoom(itemId: string | null): void;
}

/** Fora do provider (visitante, Admin, testes de componente): sem tempo real, só REST. */
const OFFLINE: RealtimeContextValue = {
  status: 'idle',
  connected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  setActiveRoom: () => {},
};

export const RealtimeContext = createContext<RealtimeContextValue>(OFFLINE);

export const useRealtime = () => useContext(RealtimeContext);
