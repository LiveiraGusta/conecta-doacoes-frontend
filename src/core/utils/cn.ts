import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Junta classes e resolve conflitos do Tailwind: a última vence (`cn('w-full h-auto', 'h-36 w-auto')`
 * → "h-36 w-auto"). Sem isso, quem ganha é a ordem no CSS, não a ordem em que as classes foram passadas.
 */
const merge = extendTailwindMerge({
  extend: {
    // Cores do tema (tokens do index.css) para o merge reconhecer conflitos entre elas.
    theme: {
      color: [
        'primary',
        'primary-hover',
        'primary-text',
        'primary-soft',
        'on-primary',
        'bg',
        'surface',
        'surface-alt',
        'fg',
        'fg-muted',
        'border',
        'accent',
        'on-accent',
        'danger',
        'success',
        'warning',
      ],
    },
  },
});

export function cn(...classes: (string | false | null | undefined)[]): string {
  return merge(classes.filter(Boolean).join(' '));
}
