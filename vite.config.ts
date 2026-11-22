import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';
import { cspConnectPlugin } from './config/csp.ts';

// No Windows, o cwd, o import.meta.url e a raiz do Vite podem vir com a letra do drive em caixas diferentes
// ("C:" × "c:"). Aí o mesmo módulo carrega duas vezes no dev ("/src/..." e "/@fs/c:/..."), e um contexto
// React duplicado quebra o useAuth. Raiz e alias saem do mesmo caminho, com o drive em maiúscula.
const root = path.resolve(import.meta.dirname).replace(/^[a-z]:/, (d) => d.toUpperCase());

// https://vite.dev/config/ — o bloco `test` é do Vitest (mesma configuração de build e de teste).
export default defineConfig(({ mode }) => {
  // Mesmas variáveis que o app recebe (arquivos .env do modo + ambiente da Vercel/CI).
  const env = loadEnv(mode, root, 'VITE_');
  const buildEnv = {
    apiUrl: env.VITE_API_URL || undefined,
    mocks: env.VITE_USE_MOCKS === 'true',
    vercelEnv: process.env.VERCEL_ENV,
  };

  return {
    root,
    plugins: [react(), tailwindcss(), svgr(), cspConnectPlugin(buildEnv)],
    resolve: {
      alias: { '@': path.join(root, 'src') },
    },
    server: { port: 5173, strictPort: true },
    build: {
      rolldownOptions: {
        output: {
          // React e router em chunks próprios: mudam pouco, então ficam no cache entre deploys.
          // MUI e as outras bibliotecas NÃO vão para um chunk único (revisão da fase 8): assim o editor de
          // foto, o arrastar, a tabela e o stepper só carregam com a página que usa.
          advancedChunks: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'router', test: /node_modules[\\/]react-router/ },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      // Os testes ponta a ponta (e2e/*.e2e.ts) são do Playwright.
      include: ['src/**/*.test.{ts,tsx}', 'config/**/*.test.ts'],
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      // Formulários com muita digitação (user-event) passam de 5 s em máquina lenta ou no CI.
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/mocks/**',
          'src/**/*.gen.ts',
          'src/main.tsx',
          'src/vite-env.d.ts',
        ],
        // Plano: ≥ 80% em src/core/ e ≥ 60% no geral (exigido no CI).
        thresholds: {
          lines: 60,
          statements: 60,
          functions: 60,
          branches: 60,
          'src/core/**': { lines: 80, statements: 80, functions: 80, branches: 75 },
        },
      },
    },
  };
});
