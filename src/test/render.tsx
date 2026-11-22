import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '@/core/api/queryClient';
import { MOBILE_QUERY } from '@/core/hooks/useMediaQuery';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { db } from '@/mocks/db';
import { routes } from '@/routes';
import { setMatchMedia } from './setup';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Rota inicial do MemoryRouter. */
  route?: string;
  /** Já entra logado com este usuário dos mocks (IDS.donor, IDS.ngoActive…). */
  loggedAs?: string;
  queryClient?: QueryClient;
}

function testQueryClient(queryClient = createQueryClient()) {
  // Nos testes, erro de rede/5xx não tenta de novo (deixaria o teste lento).
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  return queryClient;
}

/** Componente isolado com Query, tema e um MemoryRouter simples. */
export function renderWithProviders(ui: ReactElement, opts: RenderWithProvidersOptions = {}) {
  const { route = '/', loggedAs, queryClient: qc, ...rest } = opts;
  if (loggedAs) db.loginAs(loggedAs);
  const queryClient = testQueryClient(qc);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...rest }) };
}

/** Viewport do teste: o AppShell escolhe a versão desktop ou mobile pelo matchMedia. */
export function setViewport(kind: 'desktop' | 'mobile', { dark = false } = {}) {
  setMatchMedia((q) => (q === MOBILE_QUERY ? kind === 'mobile' : q.includes('dark') ? dark : false));
}

/**
 * O app inteiro (rotas reais, guards, AuthProvider, shell) num router em memória.
 * Devolve o `router` para conferir a URL: `router.state.location.pathname`.
 */
export function renderApp(path: string, opts: { loggedAs?: string; viewport?: 'desktop' | 'mobile' } = {}) {
  if (opts.loggedAs) db.loginAs(opts.loggedAs);
  setViewport(opts.viewport ?? 'desktop');
  const queryClient = testQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), router, queryClient, ...utils };
}

/** URL atual (caminho + query) do router de teste. */
export const currentUrl = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search;
