import { defineConfig, devices } from '@playwright/test';

/**
 * Testes ponta a ponta (decisão da fase 8): fluxos principais num navegador de verdade, contra o app em
 * modo mock (dados falsos do MSW). Usa o build de produção (`vite preview`) e não o `dev:mock`: o servidor
 * de desenvolvimento reotimiza dependências e recarrega a página no meio do teste.
 */
const PORT = 4174;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: '**/mobile.e2e.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
    { name: 'mobile', testMatch: '**/mobile.e2e.ts', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build:mock && npx vite preview --mode mock --outDir dist-mock --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
