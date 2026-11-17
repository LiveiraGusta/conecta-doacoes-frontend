import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IDS } from '@/mocks/db';
import { currentUrl, renderApp } from '@/test/render';

describe('rotas e guards', () => {
  it('"/" leva o visitante ao feed (placeholder da fase 3, com o título no header)', async () => {
    const { router } = renderApp('/');
    expect(await screen.findByText('Esta tela chega na fase 3 do plano.')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/feed');
    expect(screen.getByRole('heading', { level: 1, name: 'Feed de Doações' })).toBeInTheDocument();
    expect(document.title).toBe('Feed de Doações · Conecta Doações');
  });

  it('"/" leva o Admin para a moderação de ONGs', async () => {
    const { router } = renderApp('/', { loggedAs: IDS.admin });
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/ngos'));
    expect(await screen.findByText('Esta tela chega na fase 7 do plano.')).toBeInTheDocument();
  });

  it('rota que exige login manda o visitante para o login com ?redirect=', async () => {
    const { router } = renderApp('/chats/abc?x=1');
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Fchats%2Fabc%3Fx%3D1'));
  });

  it.each([
    ['/admin/ngos', IDS.donor],
    ['/donations/new', IDS.ngoActive],
    ['/chats', IDS.admin],
  ])('%s com o perfil errado mostra o 403 dentro do shell', async (path, who) => {
    renderApp(path, { loggedAs: who });
    expect(await screen.findByText('Você não tem acesso a esta página')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('doador abre a nova doação; ONG abre conversas', async () => {
    renderApp('/donations/new', { loggedAs: IDS.donor });
    expect(await screen.findByText('Esta tela chega na fase 4 do plano.')).toBeInTheDocument();
  });

  it('login já logado: vai para o redirect interno ou, se for externo, para o início', async () => {
    const first = renderApp('/login?redirect=%2Fchats', { loggedAs: IDS.donor });
    await waitFor(() => expect(currentUrl(first.router)).toBe('/chats'));
    first.unmount();

    const second = renderApp('/login?redirect=%2F%2Fsite-malicioso.example', { loggedAs: IDS.donor });
    await waitFor(() => expect(currentUrl(second.router)).toBe('/feed'));
  });

  it('visitante vê o login fora do shell', async () => {
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
  });

  it('rota inexistente mostra o 404 com Voltar e Ir para o início', async () => {
    renderApp('/nao-existe');
    expect(await screen.findByRole('heading', { name: 'Página não encontrada', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('página pessoal e detalhe do item ficam abertos ao visitante', async () => {
    renderApp('/u/qualquer');
    expect(await screen.findByText('Esta tela chega na fase 6 do plano.')).toBeInTheDocument();
  });
});
