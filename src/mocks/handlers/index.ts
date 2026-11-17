import { realtimeHandlers } from '../realtime';
import { authHandlers } from './auth';

/** Todos os handlers dos dados falsos. Cada fase acrescenta os do seu domínio. */
export const handlers = [...authHandlers, ...realtimeHandlers];
