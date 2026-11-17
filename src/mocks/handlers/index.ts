import { realtimeHandlers } from '../realtime';
import { authHandlers } from './auth';
import { itemHandlers } from './items';
import { profileHandlers } from './profile';

/** Todos os handlers dos dados falsos. Cada fase acrescenta os do seu domínio. */
export const handlers = [...authHandlers, ...itemHandlers, ...profileHandlers, ...realtimeHandlers];
