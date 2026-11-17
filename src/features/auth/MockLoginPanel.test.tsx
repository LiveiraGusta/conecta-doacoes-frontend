import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';
import { db, IDS } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';
import MockLoginPanel from './MockLoginPanel';

describe('MockLoginPanel ("Entrar como" do dev:mock)', () => {
  it('lista as 5 contas e entra com um clique', async () => {
    const { user } = renderWithProviders(
      <SnackbarProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<MockLoginPanel />} />
            <Route path="/feed" element={<p>feed</p>} />
          </Routes>
        </AuthProvider>
      </SnackbarProvider>,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Doadora'),
      expect.stringContaining('ONG aprovada'),
      expect.stringContaining('ONG em análise'),
      expect.stringContaining('ONG rejeitada'),
      expect.stringContaining('Admin'),
    ]);
    await user.click(screen.getByRole('button', { name: /ONG aprovada/ }));
    await waitFor(() => expect(db.sessionUser()?.user.id).toBe(IDS.ngoActive));
    expect(await screen.findByText('feed')).toBeInTheDocument();
  });
});
