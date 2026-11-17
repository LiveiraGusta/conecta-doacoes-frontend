import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { ibgeHandlers } from './handlers/ibge';

/**
 * Servidor de mocks dos testes (Vitest). `server.use(...)` sobrescreve um caso de erro no próprio teste.
 * Além dos handlers da API, falsifica serviços externos (IBGE), que no dev:mock são os reais.
 */
export const server = setupServer(...handlers, ...ibgeHandlers);
