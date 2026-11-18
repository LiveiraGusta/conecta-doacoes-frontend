import { describe, expect, it } from 'vitest';
import { connectSrc, productionApiProblem } from './csp';

describe('connectSrc', () => {
  it('libera a API, o WebSocket seguro dela e os serviços públicos', () => {
    expect(connectSrc('https://api.conectadoacoes.com.br/api/v1')).toBe(
      "connect-src 'self' https://api.conectadoacoes.com.br wss://api.conectadoacoes.com.br https://viacep.com.br https://servicodados.ibge.gov.br",
    );
  });

  it('usa ws: (sem TLS) para API em http, com porta', () => {
    expect(connectSrc('http://localhost:3333/api/v1')).toContain('http://localhost:3333 ws://localhost:3333');
  });
});

describe('productionApiProblem', () => {
  const prod = { mocks: false, vercelEnv: 'production' };

  it('aceita a API com https em domínio próprio', () => {
    expect(productionApiProblem({ ...prod, apiUrl: 'https://api.conectadoacoes.com.br/api/v1' })).toBeNull();
  });

  it('barra o build sem VITE_API_URL', () => {
    expect(productionApiProblem({ ...prod })).toContain('VITE_API_URL');
  });

  it('barra API sem https', () => {
    expect(productionApiProblem({ ...prod, apiUrl: 'http://api.conectadoacoes.com.br/api/v1' })).toContain('https');
  });

  it('barra API apontando para a máquina local', () => {
    expect(productionApiProblem({ ...prod, apiUrl: 'https://localhost:3333/api/v1' })).toContain('local');
  });

  it('barra os dados falsos em produção', () => {
    expect(productionApiProblem({ ...prod, mocks: true, apiUrl: 'https://api.x.com.br/api/v1' })).toContain(
      'VITE_USE_MOCKS',
    );
  });

  it('não barra fora da produção da Vercel (local, CI e previews)', () => {
    expect(productionApiProblem({ mocks: false })).toBeNull();
    expect(productionApiProblem({ mocks: true, vercelEnv: 'preview' })).toBeNull();
  });
});
