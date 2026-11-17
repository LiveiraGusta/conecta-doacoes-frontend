import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

// No Windows, o cwd, o import.meta.url e a raiz do Vite podem vir com a letra do drive em caixas diferentes
// ("C:" × "c:"). Aí o mesmo módulo carrega duas vezes no dev ("/src/..." e "/@fs/c:/..."), e um contexto
// React duplicado quebra o useAuth. Raiz e alias saem do mesmo caminho, com o drive em maiúscula.
const root = path.resolve(import.meta.dirname).replace(/^[a-z]:/, (d) => d.toUpperCase());

// https://vite.dev/config/ — o bloco `test` é do Vitest (mesma configuração de build e de teste).
export default defineConfig({
  root,
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: { '@': path.join(root, 'src') },
  },
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas em chunks próprios: mudam menos que o app, então ficam no cache entre deploys.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'mui', test: /node_modules[\\/](@mui|@emotion)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
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
});
