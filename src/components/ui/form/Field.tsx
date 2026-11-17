import ErrorRounded from '@mui/icons-material/ErrorRounded';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/core/utils/cn';
import { inputClass, useErrorText } from './fieldUtils';

export function FieldError({ id, message }: { id: string; message?: string }) {
  const text = useErrorText()(message);
  if (!text) return null;
  return (
    <p id={id} className="flex items-center gap-1 text-sm text-danger">
      <ErrorRounded fontSize="inherit" aria-hidden />
      {text}
    </p>
  );
}

/** Rótulo + controle + dica + erro, com os ids de acessibilidade ligados. */
export function FieldShell({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children(ids: { inputId: string; describedBy?: string; invalid: boolean }): ReactNode;
  className?: string;
}) {
  const inputId = useId();
  const hintId = `${inputId}-dica`;
  const errorId = `${inputId}-erro`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold text-fg">
        {label}
      </label>
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {hint && (
        <div id={hintId} className="text-xs text-fg-muted">
          {hint}
        </div>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function TextField({ label, hint, error, className, ref, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <input
          ref={ref}
          id={inputId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputClass(invalid)}
          {...input}
        />
      )}
    </FieldShell>
  );
}

/** Erro geral do formulário (credenciais erradas, 429, rede…), anunciado ao aparecer. */
export function FormAlert({ message, children }: { message?: string | null; children?: ReactNode }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-fg"
    >
      <ErrorRounded fontSize="inherit" aria-hidden className="mt-0.5 text-base text-danger" />
      <div>
        {message}
        {children}
      </div>
    </div>
  );
}
