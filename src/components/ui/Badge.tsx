import Chip, { type ChipProps } from '@mui/material/Chip';
import type { ReactNode } from 'react';

export type BadgeTone = 'accent' | 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, ChipProps['color']> = {
  // Roxo do design (categoria), igual em todos os temas: o `secondary` do tema MUI.
  accent: 'secondary',
  primary: 'primary',
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'error',
};

/** Etiqueta (Chip do MUI): categoria do item, status da ONG… */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Chip
      label={children}
      color={TONES[tone]}
      size="small"
      className={className}
      data-tone={tone}
      sx={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.7rem' }}
    />
  );
}

/** Contador (não lidas). Some no zero; acima de 99 mostra "99+". */
export function CountBadge({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <Chip
      label={count > 99 ? '99+' : count}
      aria-label={label}
      color="error"
      size="small"
      className={className}
      sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }}
    />
  );
}
