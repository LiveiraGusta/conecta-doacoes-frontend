import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES } from '@/core/schemas/common';
import { cn } from '@/core/utils/cn';
import { FieldShell, type TextFieldProps } from './Field';
import { inputClass } from './fieldUtils';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {
  /** Mostra o checklist das regras (cadastro e nova senha; não no login). */
  showRules?: boolean;
  /**
   * Valor atual só para o checklist (ex.: `watch('password')`). O input continua não controlado
   * (register do React Hook Form): passar `value` direto travaria a digitação.
   */
  rulesValue?: string;
}

/** Senha com botão de mostrar/ocultar e, opcionalmente, o checklist das regras marcando ✓ ao digitar. */
export function PasswordField({
  label,
  hint,
  error,
  showRules = false,
  rulesValue = '',
  className,
  ref,
  ...input
}: PasswordFieldProps) {
  const value = rulesValue;
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation('auth');

  const rules = showRules ? (
    <ul className="mt-1 flex flex-col gap-1" aria-label={t('password.rulesLabel')}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        const Icon = ok ? CheckCircleRounded : RadioButtonUncheckedRounded;
        return (
          <li
            key={rule.key}
            className={cn('flex items-center gap-1.5', ok ? 'text-success' : 'text-fg-muted')}
            data-ok={ok}
          >
            <Icon fontSize="inherit" aria-hidden />
            {t(`password.rules.${rule.key}`)}
            <span className="sr-only">{ok ? t('password.ruleOk') : t('password.rulePending')}</span>
          </li>
        );
      })}
    </ul>
  ) : (
    hint
  );

  return (
    <FieldShell label={label} hint={rules} error={error} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(inputClass(invalid), 'pr-11')}
            {...input}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('password.hide') : t('password.show')}
            aria-pressed={visible}
            className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg text-xl text-fg-muted hover:bg-surface-alt"
          >
            {visible ? <VisibilityOffRounded fontSize="inherit" /> : <VisibilityRounded fontSize="inherit" />}
          </button>
        </div>
      )}
    </FieldShell>
  );
}
