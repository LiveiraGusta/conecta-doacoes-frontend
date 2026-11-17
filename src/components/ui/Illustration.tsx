import Celebration from '@/assets/illustrations/celebration.svg?react';
import Empty from '@/assets/illustrations/empty.svg?react';
import ErrorArt from '@/assets/illustrations/error.svg?react';
import Login from '@/assets/illustrations/login.svg?react';
import MailSent from '@/assets/illustrations/mail-sent.svg?react';
import Messages from '@/assets/illustrations/messages.svg?react';
import NotFound from '@/assets/illustrations/not-found.svg?react';
import Offline from '@/assets/illustrations/offline.svg?react';
import Placeholder from '@/assets/illustrations/placeholder.svg?react';
import Register from '@/assets/illustrations/register.svg?react';
import Waiting from '@/assets/illustrations/waiting.svg?react';
import { cn } from '@/core/utils/cn';

/**
 * Ilustrações do unDraw (docs/ilustracoes.md). A cor de destaque original (#6c63ff) foi trocada por
 * `currentColor` nos arquivos: elas seguem a cor do tema (text-primary-500) e o modo escuro.
 * Para uma nova: salve em src/assets/illustrations/, troque #6c63ff por currentColor, tire width/height
 * do <svg> e importe aqui.
 */
const ILLUSTRATIONS = {
  login: Login,
  register: Register,
  empty: Empty,
  notFound: NotFound,
  // Ainda sem arquivo próprio (docs/ilustracoes.md): usa o placeholder.
  forbidden: Placeholder,
  error: ErrorArt,
  offline: Offline,
  waiting: Waiting,
  messages: Messages,
  mailSent: MailSent,
  celebration: Celebration,
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

export interface IllustrationProps {
  name: IllustrationName;
  className?: string;
  /** Flutua devagar, com sombra suave (parado para quem pede menos movimento no sistema). Padrão: true. */
  animated?: boolean;
}

export function Illustration({ name, className, animated = true }: IllustrationProps) {
  const Svg = ILLUSTRATIONS[name];
  return (
    <Svg
      aria-hidden
      data-illustration={name}
      className={cn('illustration-shadow h-auto w-full text-primary-500', animated && 'animate-float', className)}
    />
  );
}
