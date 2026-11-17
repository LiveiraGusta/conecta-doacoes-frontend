import { cn } from '@/core/utils/cn';

/**
 * Bloco cinza pulsante no lugar do conteúdo que ainda carrega (mesmo tamanho do final).
 * O shimmer animado entra na fase de animações.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-alt', className)} />;
}

/** Várias linhas de texto; a última mais curta. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}
