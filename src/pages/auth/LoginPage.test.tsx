import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IDS, MOCK_PASSWORD } from '@/mocks/db';
import { currentUrl, renderApp } from '@/test/render';

describe('LoginPage', () => {
  it('login certo volta para o ?redirect= e mostra o usuário no shell', async () => {
    const { user, router } = renderApp('/login?redirect=%2Fsettings');
    await user.type(await screen.findByLabelText('E-mail'), 'ong.ativa@demo.conectadoacoes.local');
    await user.type(screen.getByLabelText('Senha'), MOCK_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(currentUrl(router)).toBe('/settings'));
    expect(await screen.findByRole('button', { name: 'Conta de ONG Salvadora' })).toBeInTheDocument();
  });

  it('sem redirect, o Admin vai para a moderação', async () => {
    const { user, router } = renderApp('/login');
    await user.type(await screen.findByLabelText('E-mail'), 'admin@demo.conectadoacoes.local');
    await user.type(screen.getByLabelText('Senha'), MOCK_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/ngos'));
  });

  it('credenciais erradas: alerta genérico da API, sem dizer qual campo', async () => {
    const { user } = renderApp('/login');
    await user.type(await screen.findByLabelText('E-mail'), 'doadora@demo.conectadoacoes.local');
    await user.type(screen.getByLabelText('Senha'), 'Errada123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('validação no cliente antes de chamar a API', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(await screen.findAllByText('Campo obrigatório')).toHaveLength(2);
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('?email= pré-preenche; links para esqueci a senha e criar conta (mantendo o redirect)', async () => {
    renderApp('/login?email=ana%40x.com&redirect=%2Fchats');
    expect(await screen.findByLabelText('E-mail')).toHaveValue('ana@x.com');
    expect(screen.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register?redirect=%2Fchats');
  });

  it('mostrar/ocultar a senha', async () => {
    const { user } = renderApp('/login');
    const input = await screen.findByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('o "Entrar como" dos dados falsos não aparece fora do dev:mock', async () => {
    renderApp('/login');
    await screen.findByLabelText('E-mail');
    expect(screen.queryByText('Entrar como (dados falsos)')).not.toBeInTheDocument();
  });

  it('no mobile o formulário ocupa a tela, com a ilustração pequena em cima', async () => {
    renderApp('/login', { viewport: 'mobile' });
    const main = await screen.findByRole('main');
    expect(within(main).getByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
    expect(main.querySelector('[data-illustration="login"]')).toBeInTheDocument();
  });
});

describe('PublicOnly no login', () => {
  it('quem já está logado não vê o login', async () => {
    const { router } = renderApp('/login', { loggedAs: IDS.donor });
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
  });
});
