import { realtimeHandlers } from '../realtime';
import { authHandlers } from './auth';
import { chatHandlers } from './chats';
import { donationHandlers } from './donations';
import { itemHandlers } from './items';
import { profileHandlers } from './profile';

/** Todos os handlers dos dados falsos. Cada fase acrescenta os do seu domínio. Doações antes de itens: `/items/me` antes de `/items/:itemId`. */
export const handlers = [
  ...authHandlers,
  ...donationHandlers,
  ...chatHandlers,
  ...itemHandlers,
  ...profileHandlers,
  ...realtimeHandlers,
];
