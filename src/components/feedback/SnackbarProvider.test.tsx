import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useSnackbar, type SnackbarApi, type SnackbarOptions } from '@/core/feedback/useSnackbar';
import { SnackbarProvider } from './SnackbarProvider';

// O teste guarda a API do snackbar num objeto (o componente só a entrega via efeito).
const holder: { api?: SnackbarApi } = {};
function Grab() {
  const snackbar = useSnackbar();
  useEffect(() => {
    holder.api = snackbar;
  }, [snackbar]);
  return null;
}
const api = {
  show: (o: SnackbarOptions) => holder.api!.show(o),
  dismiss: (id?: number) => holder.api!.dismiss(id),
};
const show = (o: SnackbarOptions) => act(() => void api.show(o));

describe('SnackbarProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <SnackbarProvider>
        <Grab />
      </SnackbarProvider>,
    );
  });
  afterEach(() => vi.useRealTimers());

  it('mostra um por vez, na ordem, e cada um some em 4 s', () => {
    show({ message: 'Primeiro' });
    show({ message: 'Segundo', variant: 'success' });
    expect(screen.getByRole('alert')).toHaveTextContent('Primeiro');
    expect(screen.queryByText('Segundo')).not.toBeInTheDocument();

    // 4 s visível + a animação de saída do MUI.
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText('Segundo').closest('[data-variant]')).toHaveAttribute('data-variant', 'success');
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ação ("Desfazer") roda e fecha; o X também fecha', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const undo = vi.fn();
    show({ message: 'Interesse registrado', action: { label: 'Desfazer', onClick: undo } });
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(undo).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText('Interesse registrado')).not.toBeInTheDocument();

    show({ message: 'Outro', duration: 10_000 });
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText('Outro')).not.toBeInTheDocument();
  });

  it('duração própria e dismiss por id', () => {
    let id = 0;
    act(() => {
      id = api.show({ message: 'Longo', duration: 10_000, variant: 'error' });
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('Longo')).toBeInTheDocument();
    act(() => api.dismiss(id));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText('Longo')).not.toBeInTheDocument();
  });

  it('useSnackbar fora do provider avisa o erro', () => {
    expect(() => render(<Grab />, { container: document.createElement('div') })).toThrow(/SnackbarProvider/);
  });
});
