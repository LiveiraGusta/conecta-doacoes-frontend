import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { User } from '@/core/types/api';
import { db, IDS } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';
import { interestView } from './interestView';
import { PhotoCarousel } from './PhotoCarousel';
import { SearchBox } from './SearchBox';

const userOf = (id: string): User => db.state.users.get(id)!.user;
const item = (patch: Partial<Parameters<typeof interestView>[0]> = {}) => ({
  id: 'x',
  status: 'DISPONIVEL' as const,
  has_user_interest: false,
  is_selected: false,
  ...patch,
});

describe('interestView', () => {
  it('cobre visitante, perfis e status do item', () => {
    expect(interestView(item(), null)).toBe('login');
    expect(interestView(item(), userOf(IDS.donor))).toBe('none');
    expect(interestView(item(), userOf(IDS.admin))).toBe('none');
    expect(interestView(item(), userOf(IDS.ngoPending))).toBe('none');
    expect(interestView(item(), userOf(IDS.ngoActive))).toBe('add');
    expect(interestView(item({ has_user_interest: true }), userOf(IDS.ngoActive))).toBe('remove');
    expect(interestView(item({ status: 'EM_PROGRESSO' }), null)).toBe('inProgress');
    expect(interestView(item({ status: 'EM_PROGRESSO', is_selected: true }), userOf(IDS.ngoActive))).toBe('selected');
  });
});

describe('PhotoCarousel', () => {
  it('bolinhas clicáveis marcam a foto atual', async () => {
    const { user } = renderWithProviders(<PhotoCarousel photos={['a.png', 'b.png', 'c.png']} title="Bola" />);
    expect(screen.getByRole('img', { name: 'Foto 1 de 3: Bola' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver foto 1' })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Ver foto 3' }));
    expect(screen.getByRole('button', { name: 'Ver foto 3' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Ver foto 1' })).not.toHaveAttribute('aria-current');
  });

  it('sem fotos: aviso no lugar; uma foto: sem bolinhas', () => {
    const { rerender } = renderWithProviders(<PhotoCarousel photos={[]} title="Bola" />);
    expect(screen.getByText('Sem foto')).toBeInTheDocument();
    rerender(<PhotoCarousel photos={['a.png']} title="Bola" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SearchBox', () => {
  function Harness() {
    const [value, setValue] = useState('inicial');
    return (
      <>
        <SearchBox value={value} onSearch={setValue} />
        <button type="button" onClick={() => setValue('')}>
          limpar de fora
        </button>
        <output>{value}</output>
      </>
    );
  }

  it('acompanha o valor quando ele muda por fora; o X limpa na hora', async () => {
    const { user } = renderWithProviders(<Harness />);
    const box = screen.getByRole('searchbox');
    expect(box).toHaveValue('inicial');
    await user.click(screen.getByRole('button', { name: 'limpar de fora' }));
    expect(box).toHaveValue('');

    await user.type(box, 'abc{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('abc');
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
    expect(box).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
