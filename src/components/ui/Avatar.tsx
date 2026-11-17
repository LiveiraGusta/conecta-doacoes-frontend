import PersonRounded from '@mui/icons-material/PersonRounded';
import { useState } from 'react';
import { avatarColor, initials } from '@/core/utils/avatar';
import { cn } from '@/core/utils/cn';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
};

export interface AvatarProps {
  /** Nome exibido (iniciais e texto alternativo). Sem nome = visitante/anônimo: ícone genérico. */
  name?: string | null;
  /** Semente da cor (o id do usuário): a mesma pessoa tem sempre a mesma cor. */
  seed?: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** Foto de perfil; sem foto (ou se ela falhar), iniciais num círculo colorido. */
export function Avatar({ name, seed, src, size = 'md', className }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    SIZES[size],
    className,
  );

  if (src && !broken) {
    return <img src={src} alt={name ?? ''} className={cn(base, 'object-cover')} onError={() => setBroken(true)} />;
  }
  if (!name) {
    return (
      <span className={cn(base, 'bg-surface-alt text-fg-muted')} aria-hidden>
        <PersonRounded fontSize="inherit" className="text-[1.4em]" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(base, 'font-semibold text-white select-none')}
      style={{ backgroundColor: avatarColor(seed ?? name) }}
    >
      {initials(name)}
    </span>
  );
}
