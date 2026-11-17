import '@testing-library/jest-dom/vitest';
import { onlineManager } from '@tanstack/react-query';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import '@/i18n';
import { db } from '@/mocks/db';
import { server } from '@/mocks/node';

/*
 * Setup único para os dois ambientes de teste:
 * - jsdom (padrão): componentes e páginas;
 * - node (`// @vitest-environment node` no topo do arquivo): testes de rede/mocks com upload.
 *   No jsdom, um FormData com File chega quebrado ao fetch do Node interceptado pelo MSW
 *   ("Request body length does not match content-length header"); no node tudo é nativo.
 */
const hasDom = typeof document !== 'undefined';

// jsdom não tem matchMedia: começa como "sistema claro". Testes sobrescrevem com setMatchMedia.
export function setMatchMedia(matches: (query: string) => boolean) {
  if (typeof window === 'undefined') return;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Requisição sem handler é bug do teste: falha alto.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  db.reset();
  // O TanStack Query guarda "offline" num singleton: um teste de offline pausaria as queries dos seguintes.
  onlineManager.setOnline(true);
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
  delete document.documentElement.dataset.themeColor;
  setMatchMedia(() => false);
});
afterAll(() => server.close());

setMatchMedia(() => false);
