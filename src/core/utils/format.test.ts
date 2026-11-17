import { describe, expect, it } from 'vitest';
import { formatDateTime, relativeTime } from './format';

describe('relativeTime', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it('menos de um minuto é "agora"', () => {
    expect(relativeTime(ago(30), now)).toBe('agora');
  });

  it('usa a maior unidade que cabe', () => {
    expect(relativeTime(ago(5 * 60), now)).toMatch(/5 min/);
    expect(relativeTime(ago(2 * 3600), now)).toMatch(/2 h/);
    expect(relativeTime(ago(24 * 3600), now)).toBe('ontem');
    expect(relativeTime(ago(3 * 24 * 3600), now)).toMatch(/3 dias/);
    expect(relativeTime(ago(14 * 24 * 3600), now)).toMatch(/2 sem/);
    expect(relativeTime(ago(400 * 24 * 3600), now)).toMatch(/ano/);
  });
});

describe('formatDateTime', () => {
  it('dia/mês/ano e hora curtos', () => {
    expect(formatDateTime('2026-10-01T23:32:00')).toBe('01/10/2026, 23:32');
  });
});
