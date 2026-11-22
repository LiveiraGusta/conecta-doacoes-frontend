import { defineConfig, devices } from '@playwright/test';

/**
 * Variante dos testes ponta a ponta contra a API real (backend local com o seed de demo).
 *
 * Não sobe servidor: antes, rode o front com `npm run dev` (VITE_API_URL apontando para a API) e a API.
 * Só leitura: não cria, altera nem apaga dados, para o seed continuar igual entre execuções.
 * Login pelo formulário (não pelo painel "Entrar como", que só existe no modo mock).
 * Um worker só: a API limita o login a 10 tentativas por minuto.
 */
export default defineConfig({
  testDir: 'e2e-real',
  testMatch: '**/*.real.e2e.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
