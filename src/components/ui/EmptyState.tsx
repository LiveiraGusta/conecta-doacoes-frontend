import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';
import { Illustration, type IllustrationName } from './Illustration';

export interface EmptyStateProps {
  illustration?: IllustrationName;
  title: string;
  description?: ReactNode;
  /** Botão(ões) de ação. */
  action?: ReactNode;
  className?: string;
}

/** Estado vazio ou de erro com ilustração (feed vazio, sem conversas, 404…). */
export function EmptyState({ illustration = 'empty', title, description, action, className }: EmptyStateProps) {
  return (
    <section className={cn('mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <Illustration name={illustration} className="mb-2 max-w-64" />
      <h2 className="text-xl font-bold text-fg">{title}</h2>
      {description && <div className="text-fg-muted">{description}</div>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </section>
  );
}
