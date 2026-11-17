/**
 * Avatar de iniciais: "Marina Souza" → "MS"; "ONG Salvadora" → "OS"; "Marina S." → "MS".
 * Uma palavra só: as duas primeiras letras ("Admin" → "AD").
 */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

/**
 * Paleta fixa (decisão da fase 1b): não depende da cor do tema, então a mesma pessoa tem sempre a mesma cor.
 * Todas com contraste AA para texto branco.
 */
export const AVATAR_COLORS = [
  '#0057a8', // azul
  '#047857', // verde
  '#6d28d9', // roxo
  '#c2410c', // laranja
  '#be185d', // rosa
  '#0e7490', // ciano
  '#4d7c0f', // oliva
  '#7c2d12', // marrom
] as const;

/** Hash estável (FNV-1a) do id → índice da paleta. */
export function avatarColor(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length]!;
}
