import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import MuiIconButton, { type IconButtonProps as MuiIconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra o spinner e desabilita (evita clique duplo). */
  loading?: boolean;
  icon?: ReactNode;
  /** Vira um link do React Router com cara de botão. */
  to?: string;
}

const VARIANTS: Record<ButtonVariant, Pick<MuiButtonProps, 'variant' | 'color'> & { sx?: MuiButtonProps['sx'] }> = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'primary' },
  ghost: { variant: 'text', color: 'primary' },
  danger: { variant: 'contained', color: 'error' },
  // Sobre o header azul: botão claro com texto na cor do tema.
  inverse: {
    variant: 'contained',
    color: 'inherit',
    sx: { bgcolor: 'common.white', color: 'primary.dark', '&:hover': { bgcolor: 'grey.100' } },
  },
};

const SIZES: Record<ButtonSize, MuiButtonProps['size']> = { sm: 'small', md: 'medium', lg: 'large' };

/**
 * Botão do app sobre o Button do MUI (decisão da fase 1c: componentes Material, como no Angular Material).
 * Mantém a API usada nas telas: `variant` do design, `loading`, `icon` e `to` para links.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  to,
  type = 'button',
  sx,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const common = {
    variant: v.variant,
    color: v.color,
    size: SIZES[size],
    loading,
    startIcon: icon,
    'aria-busy': loading || undefined,
    sx: [v.sx ?? {}, ...(Array.isArray(sx) ? sx : [sx ?? {}])],
    ...rest,
  } as MuiButtonProps;
  // Como link, o `ref` é de <a> e não de <button>: o cast evita o conflito de tipos do MUI.
  return to ? (
    <MuiButton {...(common as object)} component={RouterLink} to={to} />
  ) : (
    <MuiButton {...common} type={type} />
  );
}

export interface IconButtonProps extends Omit<MuiIconButtonProps, 'aria-label'> {
  /** Obrigatório: o botão só tem ícone, então o nome vem daqui (leitor de tela e tooltip). */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, ...rest }: IconButtonProps) {
  const button = (
    <MuiIconButton aria-label={label} {...rest}>
      {children}
    </MuiIconButton>
  );
  // Tooltip não funciona em botão desabilitado (sem eventos de mouse): aí vai sem.
  return rest.disabled ? button : <Tooltip title={label}>{button}</Tooltip>;
}
