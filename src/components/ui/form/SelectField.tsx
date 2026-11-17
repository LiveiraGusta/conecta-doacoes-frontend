import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/core/utils/cn';
import { FieldShell } from './Field';
import { inputClass } from './fieldUtils';

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  ref?: React.Ref<HTMLSelectElement>;
}

/** Select nativo (melhor no celular) com o mesmo visual dos campos. */
export function SelectField({ label, hint, error, options, placeholder, className, ref, ...select }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(inputClass(invalid), 'appearance-none pr-9')}
            {...select}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <KeyboardArrowDownRounded
            fontSize="inherit"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 my-auto text-xl text-fg-muted"
          />
        </div>
      )}
    </FieldShell>
  );
}
