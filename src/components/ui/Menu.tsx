import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/core/utils/cn';

export type MenuItem =
  | { kind: 'link'; label: string; to: string; icon?: ReactNode }
  | { kind: 'action'; label: string; onSelect(): void; icon?: ReactNode; danger?: boolean };

export interface MenuProps {
  /** Conteúdo do botão que abre o menu (ex.: avatar + nome). */
  trigger: ReactNode;
  /** Nome acessível do botão. */
  label: string;
  items: MenuItem[];
  align?: 'start' | 'end';
  triggerClassName?: string;
}

/**
 * Menu suspenso acessível (menu do avatar): abre no clique, Esc e clique fora fecham,
 * setas ↑/↓ navegam, foco volta ao botão ao fechar.
 */
export function Menu({ trigger, label, items, align = 'end', triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const itemsEls = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    itemsEls()[0]?.focus();

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const list = itemsEls();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass = (danger?: boolean) =>
    cn(
      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm outline-none hover:bg-surface-alt focus-visible:bg-surface-alt [&_svg]:text-lg',
      danger ? 'text-danger' : 'text-fg',
    );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-full z-30 mt-2 min-w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) =>
            item.kind === 'link' ? (
              <Link key={item.label} to={item.to} role="menuitem" className={itemClass()} onClick={() => close(false)}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={itemClass(item.danger)}
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
