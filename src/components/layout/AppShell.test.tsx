import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { db, IDS } from '@/mocks/db';
import { currentUrl, renderApp } from '@/test/render';
import { SIDEBAR_STORAGE_KEY } from './Sidebar';

describe('AppShell desktop', () => {
  it('sidebar com os 4 itens do design, título no header e Entrar/Criar conta para visitante', async () => {
    renderApp('/feed');
    // Espera o /auth/me responder (antes disso o header mostra o esqueleto).
    expect(await screen.findByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register');
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label')),
    ).toEqual(['Feed']);
    expect(
      within(nav)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Conversas', 'Doações', 'Perfil']);
    expect(screen.queryByRole('button', { name: /Conta de/ })).not.toBeInTheDocument();
  });

  it('visitante que clica em Conversas recebe "Entre para continuar" e volta para lá depois', async () => {
    const { user, router } = renderApp('/feed');
    await user.click(await screen.findByRole('button', { name: 'Conversas' }));
    const dialog = screen.getByRole('dialog', { name: 'Entre para continuar' });
    await user.click(within(dialog).getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Fchats'));
  });

  it('recolher a sidebar esconde os textos e lembra a escolha', async () => {
    const { user, unmount } = renderApp('/feed', { loggedAs: IDS.donor });
    await user.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('true');
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute('aria-expanded', 'false');
    unmount();

    renderApp('/feed', { loggedAs: IDS.donor });
    expect(await screen.findByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  });

  it('logado: nome, cidade e menu da conta; Sair pede confirmação e vira visitante', async () => {
    const { user, router } = renderApp('/feed', { loggedAs: IDS.donor });
    const trigger = await screen.findByRole('button', { name: 'Conta de Marina Souza' });
    expect(screen.getByText('São Paulo - SP')).toBeInTheDocument();

    await user.click(trigger);
    const menu = screen.getByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Minha página', 'Editar perfil', 'Configurações', 'Sair']);
    expect(within(menu).getByRole('menuitem', { name: 'Minha página' })).toHaveAttribute('href', `/u/${IDS.donor}`);

    await user.click(within(menu).getByRole('menuitem', { name: 'Sair' }));
    const dialog = screen.getByRole('dialog', { name: 'Deseja sair?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument());
    expect(currentUrl(router)).toBe('/feed');
    expect(db.sessionUser()).toBeNull();
  });

  it('Admin tem ONGs, Denúncias e Configurações, sem "Minha página"', async () => {
    const { user } = renderApp('/admin/ngos', { loggedAs: IDS.admin });
    await screen.findByRole('button', { name: 'Conta de Admin' });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label')),
    ).toEqual(['ONGs', 'Denúncias', 'Configurações']);
    await user.click(screen.getByRole('button', { name: 'Conta de Admin' }));
    expect(screen.queryByRole('menuitem', { name: 'Minha página' })).not.toBeInTheDocument();
  });

  it('ONG pendente vê o aviso de análise; rejeitada vê o motivo e o link de reenvio', async () => {
    const pending = renderApp('/feed', { loggedAs: IDS.ngoPending });
    expect(await screen.findByText('Seu cadastro está em análise.')).toBeInTheDocument();
    pending.unmount();

    renderApp('/feed', { loggedAs: IDS.ngoRejected });
    expect(await screen.findByText(/O documento enviado está ilegível/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reenviar documento' })).toHaveAttribute('href', '/profile?aba=conta');
  });

  it('sem internet aparece a faixa "Você está offline"', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderApp('/feed');
    await screen.findByRole('navigation', { name: 'Navegação principal' });
    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/Você está offline/)).toBeInTheDocument();
  });
});

describe('AppShell mobile', () => {
  it('header compacto com o título, BottomNav com 4 ícones e sem sidebar', async () => {
    renderApp('/feed', { viewport: 'mobile', loggedAs: IDS.ngoActive });
    await screen.findByRole('button', { name: 'Conta de ONG Salvadora' });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label')),
    ).toEqual(['Feed', 'Conversas', 'Doações', 'Perfil']);
    expect(screen.queryByRole('button', { name: 'Recolher menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Feed de Doações' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conta de ONG Salvadora' })).toBeInTheDocument();
  });

  it('visitante no mobile tem o atalho de Entrar no header', async () => {
    renderApp('/feed', { viewport: 'mobile' });
    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });
});

describe('AppShell: troca de desktop para mobile', () => {
  it('a página não remonta (o que estava preenchido continua) e a busca muda de lugar', async () => {
    renderApp('/feed', { loggedAs: IDS.donor });
    const title = await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();

    // matchMedia que avisa os ouvintes quando a largura "muda".
    let mobile = false;
    const listeners = new Set<() => void>();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        get matches() {
          return query.includes('max-width') ? mobile : false;
        },
        media: query,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      }),
    });
    act(() => {
      mobile = true;
      listeners.forEach((fn) => fn());
    });

    // Casca mobile (barra de baixo), mesma página: o mesmo nó do título continua no documento.
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(title.isConnected).toBe(true);
    expect(screen.getByRole('heading', { name: 'Últimas doações (8)' })).toBe(title);
  });
});
