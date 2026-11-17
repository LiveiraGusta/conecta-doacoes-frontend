import MuiSkeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

/**
 * Bloco no lugar do conteúdo que ainda carrega (Skeleton do MUI). O tamanho vem do Tailwind (`className`),
 * igual ao do conteúdo final.
 */
export function Skeleton({ className, circle = false }: { className?: string; circle?: boolean }) {
  return (
    <MuiSkeleton
      variant={circle ? 'circular' : 'rounded'}
      animation="wave"
      aria-hidden
      className={className}
      // Sem tamanho fixo do MUI: quem manda é o className.
      sx={{ width: 'auto', height: 'auto', transform: 'none' }}
    />
  );
}

/** Várias linhas de texto; a última mais curta. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <MuiSkeleton key={i} variant="text" animation="wave" width={i === lines - 1 ? '66%' : '100%'} />
      ))}
    </div>
  );
}

/** Região carregando, para o leitor de tela: "Carregando…" uma vez, os blocos ficam escondidos. */
export function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}
