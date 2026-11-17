import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { MOCK_RESET_TOKEN } from '@/mocks/handlers/auth';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { currentUrl, renderApp } from '@/test/render';

describe('Esqueci a senha', () => {
  it('sempre a mesma resposta, com o prazo de 30 minutos', async () => {
    const { user } = renderApp('/forgot-password');
    await user.type(await screen.findByLabelText('E-mail'), 'qualquer@x.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument();
    expect(screen.getByText(/Ele vale por 30 minutos/)).toBeInTheDocument();
  });

  it('429 vira alerta com a mensagem da API', async () => {
    server.use(
      http.post(apiUrl('/auth/password/forgot'), () =>
        HttpResponse.json(
          { error: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Tente de novo em instantes.' },
          { status: 429 },
        ),
      ),
    );
    const { user } = renderApp('/forgot-password');
    await user.type(await screen.findByLabelText('E-mail'), 'qualquer@x.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas requisições');
  });
});

describe('Redefinir senha', () => {
  it('sem token: link inválido com "Pedir um novo link"', async () => {
    renderApp('/redefinir-senha');
    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/forgot-password');
  });

  it('confirmação diferente é recusada no cliente', async () => {
    const { user } = renderApp(`/redefinir-senha?token=${MOCK_RESET_TOKEN}`);
    await user.type(await screen.findByLabelText('Nova senha'), 'Senha123');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'Senha124');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument();
  });

  it('token expirado (INVALID_RESET_TOKEN) troca para a tela de link inválido', async () => {
    const { user } = renderApp('/redefinir-senha?token=expirado');
    await user.type(await screen.findByLabelText('Nova senha'), 'Senha123');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'Senha123');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument();
  });

  it('erro de validação da API (new_password) aparece no campo da senha', async () => {
    server.use(
      http.post(apiUrl('/auth/password/reset'), () =>
        HttpResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Dados inválidos.',
            details: [{ path: 'new_password', message: 'Senha muito comum' }],
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderApp(`/redefinir-senha?token=${MOCK_RESET_TOKEN}`);
    await user.type(await screen.findByLabelText('Nova senha'), 'Senha123');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'Senha123');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha muito comum')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sucesso: snackbar "Senha alterada" e volta para o login', async () => {
    const { user, router } = renderApp(`/redefinir-senha?token=${MOCK_RESET_TOKEN}`);
    await user.type(await screen.findByLabelText('Nova senha'), 'Senha123');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'Senha123');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/login'));
    expect(await screen.findByText('Senha alterada. Entre com a senha nova.')).toBeInTheDocument();
  });
});
