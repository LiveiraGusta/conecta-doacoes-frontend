import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import MuiIconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES } from '@/core/schemas/common';
import { cn } from '@/core/utils/cn';
import { TextField, type TextFieldProps } from './Field';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {
  /** Mostra o checklist das regras (cadastro e nova senha; não no login). */
  showRules?: boolean;
  /**
   * Valor atual só para o checklist (ex.: `watch('password')`). O input continua não controlado
   * (register do React Hook Form): passar `value` direto travaria a digitação.
   */
  rulesValue?: string;
}

/** Senha (TextField do MUI) com mostrar/ocultar e, opcionalmente, o checklist das regras marcando ✓ ao digitar. */
export function PasswordField({ hint, showRules = false, rulesValue = '', slotProps, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation('auth');

  const rules = showRules ? (
    <ul className="mt-1 flex flex-col gap-1" aria-label={t('password.rulesLabel')}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(rulesValue);
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
    <>
      <TextField
        type={visible ? 'text' : 'password'}
        hint={showRules ? undefined : hint}
        {...rest}
        slotProps={{
          ...slotProps,
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <MuiIconButton
                  edge="end"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? t('password.hide') : t('password.show')}
                  aria-pressed={visible}
                >
                  {visible ? <VisibilityOffRounded /> : <VisibilityRounded />}
                </MuiIconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {showRules && <div className="-mt-2 px-3.5 text-xs">{rules}</div>}
    </>
  );
}
