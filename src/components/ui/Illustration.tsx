import Placeholder from '@/assets/illustrations/placeholder.svg?react';
import { cn } from '@/core/utils/cn';

/**
 * Ilustrações do unDraw (docs/ilustracoes.md). Enquanto os SVGs não chegam, todas usam o placeholder.
 * Para trocar: salve o arquivo em src/assets/illustrations/<nome>.svg, troque a cor de destaque
 * do unDraw (#6c63ff) por currentColor e importe-o aqui no lugar do placeholder.
 * A cor de destaque segue o tema (text-primary-500).
 */
const ILLUSTRATIONS = {
  login: Placeholder,
  register: Placeholder,
  empty: Placeholder,
  notFound: Placeholder,
  forbidden: Placeholder,
  error: Placeholder,
  offline: Placeholder,
  waiting: Placeholder,
  messages: Placeholder,
  mailSent: Placeholder,
  celebration: Placeholder,
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  const Svg = ILLUSTRATIONS[name];
  return <Svg aria-hidden className={cn('h-auto w-full text-primary-500', className)} data-illustration={name} />;
}
