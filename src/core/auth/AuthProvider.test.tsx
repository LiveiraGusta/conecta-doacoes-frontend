import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { api } from '@/core/api/http';
import { db, IDS } from '@/mocks/db';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { currentUrl, renderApp } from '@/test/render';

describe('AuthProvider', () => {
  it('aplica as preferências de tema que vêm do /auth/me', async () => {
    db.state.users.get(IDS.donor)!.user.preferences = { theme_color: 'ROSA', theme_mode: 'DARK', show_donations: true };
    renderApp('/feed', { loggedAs: IDS.donor });
    await waitFor(() => expect(document.documentElement.dataset.themeColor).toBe('rosa'));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('401 numa rota fechada: avisa "sessão expirou" e manda para o login voltando para a página atual', async () => {
    server.use(
      http.get(apiUrl('/items/feed'), () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
    );
    const { router } = renderApp('/settings', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Aparência' });

    await act(async () => {
      await api('/items/feed').catch(() => {});
    });

    expect(await screen.findByText('Sua sessão expirou. Entre de novo para continuar.')).toBeInTheDocument();
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Fsettings'));
  });

  it('401 quando já é visitante não mostra aviso nem redireciona', async () => {
    server.use(
      http.get(apiUrl('/items/feed'), () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
    );
    const { router } = renderApp('/feed');
    await screen.findByRole('heading', { name: /Doações de todas as cidades/ });
    await act(async () => {
      await api('/items/feed').catch(() => {});
    });
    expect(screen.queryByText(/sessão expirou/)).not.toBeInTheDocument();
    expect(currentUrl(router)).toBe('/feed');
  });

  it('erro de rede no /auth/me não trava o app: segue como visitante depois do erro', async () => {
    server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.error()));
    renderApp('/feed');
    expect(await screen.findByRole('link', { name: 'Criar conta' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Doações de todas as cidades/ })).toBeInTheDocument();
  });
});
