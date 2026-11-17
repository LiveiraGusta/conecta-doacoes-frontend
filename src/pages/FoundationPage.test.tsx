import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IDS } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';
import { FoundationPage } from './FoundationPage';

describe('FoundationPage (provisória da fase 1a)', () => {
  it('visitante: mostra "Visitante (sem login)"', async () => {
    renderWithProviders(<FoundationPage />);
    expect(await screen.findByText('Visitante (sem login)')).toBeInTheDocument();
  });

  it('logado: mostra o nome vindo do /auth/me', async () => {
    renderWithProviders(<FoundationPage />, { loggedAs: IDS.ngoActive });
    expect(await screen.findByText('Logado como ONG Salvadora')).toBeInTheDocument();
  });

  it('trocar a cor e o modo atualiza o <html> e marca o botão', async () => {
    const { user } = renderWithProviders(<FoundationPage />);
    await user.click(screen.getByRole('button', { name: 'Verde' }));
    expect(document.documentElement.dataset.themeColor).toBe('verde');
    expect(screen.getByRole('button', { name: 'Verde' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Escuro' }));
    expect(document.documentElement).toHaveClass('dark');
  });
});
