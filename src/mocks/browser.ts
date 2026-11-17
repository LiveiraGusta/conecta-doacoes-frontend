import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Service Worker do `npm run dev:mock` (e dos previews da Vercel com VITE_USE_MOCKS=true). */
export const worker = setupWorker(...handlers);
