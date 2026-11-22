import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/core/api/http';
import { ErrorPage } from './SystemPages';

const renderThrowing = (error: unknown) => {
  const router = createMemoryRouter([
    {
      path: '/',
      errorElement: <ErrorPage />,
      loader: () => {
        throw error;
      },
      element: <p>nunca</p>,
    },
  ]);
  render(<RouterProvider router={router} />);
};

describe('ErrorPage (erro inesperado)', () => {
  it('erro da API mostra o x-request-id para o suporte e o botão de tentar de novo', async () => {
    renderThrowing(new ApiError(500, 'INTERNAL_ERROR', 'Erro inesperado.', undefined, 'req-abc123'));
    expect(await screen.findByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(screen.getByTestId('request-id')).toHaveTextContent('Código para o suporte: req-abc123');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('erro qualquer: mensagem genérica, sem código', async () => {
    renderThrowing(new Error('boom'));
    expect(await screen.findByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(screen.queryByTestId('request-id')).not.toBeInTheDocument();
  });

  it('404 do router vira a tela de não encontrado', async () => {
    renderThrowing(new Response('', { status: 404 }));
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
