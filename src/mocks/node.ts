import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Servidor de mocks dos testes (Vitest). `server.use(...)` sobrescreve um caso de erro no próprio teste. */
export const server = setupServer(...handlers);
