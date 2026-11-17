import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

export type BadgeTone = 'accent' | 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  // Roxo do design (categoria), igual em todos os temas.
  accent: 'bg-accent text-on-accent',
  primary: 'bg-primary text-on-primary',
  neutral: 'bg-surface-alt text-fg-muted',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
};

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
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Bolinha com número (não lidas). Acima de 99 mostra "99+". */
export function CountBadge({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] leading-5 font-bold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
