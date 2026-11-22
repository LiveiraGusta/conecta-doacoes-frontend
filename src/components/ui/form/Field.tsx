import Alert from '@mui/material/Alert';
import FormHelperText from '@mui/material/FormHelperText';
import MuiTextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';
import type { ReactNode } from 'react';
import { useErrorText } from './fieldUtils';

/** Erro de um campo que não é TextField do MUI (ex.: área de arquivo). */
export function FieldError({ id, message }: { id: string; message?: string }) {
  const text = useErrorText()(message);
  if (!text) return null;
  return (
    <FormHelperText id={id} error>
      {text}
    </FormHelperText>
  );
}

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'error' | 'helperText' | 'variant'> {
  label: string;
  hint?: ReactNode;
  /** Mensagem de erro (chave de tradução do Zod ou texto da API). */
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Campo de texto (TextField do MUI, contornado). Funciona com o `register` do React Hook Form:
 * o `ref` do register vai para o input. Erro e dica aparecem no helperText, ligados por aria-describedby.
 */
export function TextField({ label, hint, error, ref, slotProps, ...rest }: TextFieldProps) {
  const errorText = useErrorText()(error);
  return (
    <MuiTextField
      label={label}
      inputRef={ref}
      error={Boolean(errorText)}
      helperText={errorText ?? hint}
      slotProps={{ ...slotProps, formHelperText: { component: 'div', ...slotProps?.formHelperText } as object }}
      {...rest}
    />
  );
}

/** Erro geral do formulário (credenciais erradas, 429, rede…), anunciado ao aparecer. */
export function FormAlert({ message, children }: { message?: string | null; children?: ReactNode }) {
  if (!message) return null;
  return (
    <Alert severity="error" role="alert" variant="outlined">
      {message}
      {children}
    </Alert>
  );
}
