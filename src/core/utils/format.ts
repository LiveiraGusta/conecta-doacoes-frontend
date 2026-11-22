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

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/** Hora da mensagem: "14:05". */
export const formatTime = (iso: string) => time.format(new Date(iso));

/** "01/10/2026". */
export const formatDate = (iso: string) => date.format(new Date(iso));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Separador de dia no chat: 'today', 'yesterday' ou a data ("01/10/2026"), no fuso do navegador. */
export function dayLabel(iso: string, now: Date = new Date()): 'today' | 'yesterday' | string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / (24 * 3600 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return formatDate(iso);
}
