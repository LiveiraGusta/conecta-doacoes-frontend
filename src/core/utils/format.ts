const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto', style: 'short' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * Tempo relativo como no design do card ("há 2 h", "ontem"). Datas da API vêm em UTC (ISO 8601);
 * a formatação usa o fuso do navegador.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'agora';
}

/** Data e hora curtas, como no detalhe mobile do design: "01/10/2026, 23:32". */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
