import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { normalizeText } from '@/core/services/ibge';
import { cn } from '@/core/utils/cn';
import { FieldShell } from './Field';
import { inputClass } from './fieldUtils';

export interface ComboboxProps {
  label: string;
  value: string;
  onChange(value: string): void;
  onBlur?(): void;
  options: readonly string[];
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Mensagem quando nada combina com o texto. */
  emptyText: string;
  name?: string;
  /** Máximo de sugestões visíveis. */
  limit?: number;
}

/**
 * Campo com sugestões (padrão ARIA combobox + listbox): filtra sem acento e sem caixa,
 * ↑/↓ navegam, Enter escolhe, Esc fecha. O texto digitado continua valendo se a lista não carregar.
 */
export function Combobox({
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  hint,
  placeholder,
  disabled,
  emptyText,
  name,
  limit = 8,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = normalizeText(value);
    const found = q ? options.filter((o) => normalizeText(o).includes(q)) : options;
    // Quem começa com o texto vem primeiro ("São" → São Paulo antes de Santo André do São…).
    return [...found]
      .sort((a, b) => Number(!normalizeText(a).startsWith(q)) - Number(!normalizeText(b).startsWith(q)))
      .slice(0, limit);
  }, [options, value, limit]);

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const optionId = (i: number) => `${listId}-op-${i}`;
  const showList = open && !disabled && (matches.length > 0 || value.trim() !== '');

  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            name={name}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && matches[active] ? optionId(active) : undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            className={inputClass(invalid)}
            onChange={(e) => {
              onChange(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              onBlur?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && showList && matches[active]) {
                e.preventDefault();
                choose(matches[active]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-xl"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-fg-muted">{emptyText}</li>
              ) : (
                matches.map((option, i) => (
                  <li
                    key={option}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    // mousedown (e não click): escolhe antes do blur fechar a lista.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(option);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm',
                      i === active ? 'bg-primary-soft text-primary-text' : 'text-fg',
                    )}
                  >
                    {option}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </FieldShell>
  );
}
