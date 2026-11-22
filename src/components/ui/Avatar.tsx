import MuiAvatar from '@mui/material/Avatar';
import { useState } from 'react';
import { avatarColor, initials } from '@/core/utils/avatar';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, { box: number; font: string }> = {
  sm: { box: 32, font: '0.75rem' },
  md: { box: 40, font: '0.875rem' },
  lg: { box: 56, font: '1.125rem' },
  xl: { box: 96, font: '1.875rem' },
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

/** Foto de perfil (Avatar do MUI); sem foto, ou se ela falhar, iniciais num círculo colorido. */
export function Avatar({ name, seed, src, size = 'md', className }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const { box, font } = SIZES[size];
  const showImage = Boolean(src) && !broken;

  if (!name && !showImage) {
    return <MuiAvatar aria-hidden className={className} sx={{ width: box, height: box }} />;
  }
  return (
    <MuiAvatar
      src={showImage ? src! : undefined}
      alt={name ?? ''}
      className={className}
      role={showImage ? undefined : 'img'}
      aria-label={showImage ? undefined : (name ?? undefined)}
      slotProps={{ img: { onError: () => setBroken(true) } }}
      sx={{
        width: box,
        height: box,
        fontSize: font,
        fontWeight: 600,
        color: '#fff',
      }}
      // Cor por pessoa em estilo inline (fixa e fácil de conferir); o MUI cuida do resto.
      style={showImage ? undefined : { backgroundColor: avatarColor(seed ?? name ?? '') }}
    >
      {name ? initials(name) : null}
    </MuiAvatar>
  );
}
