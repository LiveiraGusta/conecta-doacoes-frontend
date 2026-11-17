import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setViewport } from '@/test/render';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

function Harness({ onClose = vi.fn(), closeOnBackdrop = true }: { onClose?: () => void; closeOnBackdrop?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Modal
        open={open}
        title="Localização"
        closeOnBackdrop={closeOnBackdrop}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        footer={<button>Salvar</button>}
      >
        <input aria-label="Cidade" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('abre com foco dentro, trava a rolagem e devolve o foco a quem abriu ao fechar com Esc', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Localização' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('Tab fica preso dentro do modal (do último volta ao primeiro)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const close = screen.getByRole('button', { name: 'Fechar' });
    const save = screen.getByRole('button', { name: 'Salvar' });
    expect(close).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Cidade')).toHaveFocus();
    await user.tab();
    expect(save).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(save).toHaveFocus();
  });

  it('clique no fundo fecha; com closeOnBackdrop=false não fecha', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
    unmount();

    const keep = vi.fn();
    render(<Harness onClose={keep} closeOnBackdrop={false} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(keep).not.toHaveBeenCalled();
  });

  it('no mobile vira bottom-sheet', async () => {
    setViewport('mobile');
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog')).toHaveClass('rounded-t-3xl');
  });
});

describe('ConfirmDialog', () => {
  it('confirma ou cancela; carregando trava os botões', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Cancelar negociação?"
        danger
        confirmLabel="Cancelar negociação"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        O item volta para a vitrine.
      </ConfirmDialog>,
    );
    expect(screen.getByText('O item volta para a vitrine.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar negociação' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <ConfirmDialog open loading title="Cancelar negociação?" onConfirm={onConfirm} onCancel={onCancel}>
        x
      </ConfirmDialog>,
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveAttribute('aria-busy', 'true');
  });
});
