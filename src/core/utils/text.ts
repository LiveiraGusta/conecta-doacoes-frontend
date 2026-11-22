import { normalizeText } from '../services/ibge';

/**
 * Filtra opções pelo texto digitado, sem acento e sem caixa. Quem começa com o texto vem primeiro
 * ("São" → São Paulo antes de "Santo André do São…").
 */
export function filterByText(options: readonly string[], text: string, limit: number): string[] {
  const q = normalizeText(text);
  const found = q ? options.filter((o) => normalizeText(o).includes(q)) : [...options];
  return found
    .sort((a, b) => Number(!normalizeText(a).startsWith(q)) - Number(!normalizeText(b).startsWith(q)))
    .slice(0, limit);
}
