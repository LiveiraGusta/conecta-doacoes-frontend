import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { createQueryClient } from '@/core/api/queryClient';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { db } from '@/mocks/db';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Rota inicial do MemoryRouter. */
  route?: string;
  /** Já entra logado com este usuário dos mocks (IDS.donor, IDS.ngoActive…). */
  loggedAs?: string;
  queryClient?: QueryClient;
}

/** Renderiza com os providers do app (Query, tema, rotas) e devolve o `user` do user-event. */
export function renderWithProviders(ui: ReactElement, opts: RenderWithProvidersOptions = {}) {
  const { route = '/', loggedAs, queryClient = createQueryClient(), ...rest } = opts;
  if (loggedAs) db.loginAs(loggedAs);
  // Nos testes, erro de rede/5xx não deve tentar de novo (deixaria o teste lento).
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...rest }) };
}
