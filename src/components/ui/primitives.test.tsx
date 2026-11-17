import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { avatarColor } from '@/core/utils/avatar';
import { Avatar } from './Avatar';
import { Badge, CountBadge } from './Badge';
import { Button, IconButton } from './Button';
import { EmptyState } from './EmptyState';
import { Menu } from './Menu';

describe('Avatar', () => {
  it('sem foto: iniciais na cor do id', () => {
    render(<Avatar name="Marina Souza" seed="user-1" />);
    const el = screen.getByRole('img', { name: 'Marina Souza' });
    expect(el).toHaveTextContent('MS');
    expect(el.style.backgroundColor).toBe(hexToRgb(avatarColor('user-1')));
  });

  it('com foto usa a imagem; se ela falhar, cai nas iniciais', () => {
    render(<Avatar name="ONG Salvadora" src="https://x/avatar.webp" />);
    const img = screen.getByRole('img', { name: 'ONG Salvadora' });
    expect(img.tagName).toBe('IMG');
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'ONG Salvadora' })).toHaveTextContent('OS');
  });

  it('sem nome (visitante): ícone genérico escondido do leitor de tela', () => {
    const { container } = render(<Avatar />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Button', () => {
  it('loading desabilita e marca aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publicar
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Publicar' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('IconButton usa o label como nome e tooltip', () => {
    render(<IconButton label="Fechar">x</IconButton>);
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveAttribute('title', 'Fechar');
  });
});

describe('Badge e CountBadge', () => {
  it('CountBadge some no zero e mostra 99+ acima de 99', () => {
    const { rerender, container } = render(<CountBadge count={0} label="0 não lidas" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CountBadge count={150} label="150 não lidas" />);
    expect(screen.getByLabelText('150 não lidas')).toHaveTextContent('99+');
  });

  it('Badge de categoria usa o roxo de destaque', () => {
    render(<Badge tone="accent">Roupas</Badge>);
    expect(screen.getByText('Roupas')).toHaveClass('bg-accent');
  });
});

describe('EmptyState', () => {
  it('ilustração, título, descrição e ação', () => {
    render(
      <EmptyState
        illustration="messages"
        title="Sem conversas"
        description="Ainda nada por aqui."
        action={<button>Ver feed</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Sem conversas' })).toBeInTheDocument();
    expect(document.querySelector('[data-illustration="messages"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver feed' })).toBeInTheDocument();
  });
});

describe('Menu', () => {
  const setup = () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter>
        <Menu
          label="Conta"
          trigger="abrir"
          items={[
            { kind: 'link', label: 'Minha página', to: '/u/1' },
            { kind: 'action', label: 'Sair', onSelect: onLogout, danger: true },
          ]}
        />
        <p>fora</p>
      </MemoryRouter>,
    );
    return { onLogout, user: userEvent.setup() };
  };

  it('abre com foco no 1º item, setas navegam, Esc fecha e devolve o foco', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Conta' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Minha página' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Minha página' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ação roda e fecha; clique fora fecha', async () => {
    const { user, onLogout } = setup();
    await user.click(screen.getByRole('button', { name: 'Conta' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Conta' }));
    await user.click(screen.getByText('fora'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
