import type { CSSProperties } from 'react';

/**
 * Atraso da entrada em cascata (fase 9): cada item de uma página entra 30 ms depois do anterior,
 * no máximo 8 passos (listas longas não ficam esperando).
 */
export const stagger = (index: number, step = 30, max = 8): CSSProperties => ({
  animationDelay: `${Math.min(index, max) * step}ms`,
});
