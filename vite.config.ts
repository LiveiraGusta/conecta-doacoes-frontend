import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/ — o bloco `test` é do Vitest (mesma configuração de build e de teste).
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
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
