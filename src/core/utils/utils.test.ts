import { describe, expect, it } from 'vitest';
import { AVATAR_COLORS, avatarColor, initials } from './avatar';
import { cn } from './cn';
import { safeRedirect } from './redirect';

describe('initials', () => {
  it.each([
    ['Marina Souza', 'MS'],
    ['Marina S.', 'MS'],
    ['ONG Salvadora', 'OS'],
    ['Instituto Novo Começo', 'IC'],
    ['Admin', 'AD'],
    ['  ', '?'],
    ['élio árias', 'ÉÁ'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('avatarColor', () => {
  it('é estável e sempre da paleta', () => {
    expect(avatarColor('abc')).toBe(avatarColor('abc'));
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    expect(ids.every((id) => (AVATAR_COLORS as readonly string[]).includes(avatarColor(id)))).toBe(true);
    // Espalha: com 50 ids, usa ao menos metade das cores.
    expect(new Set(ids.map(avatarColor)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('safeRedirect', () => {
  it('aceita só caminhos internos', () => {
    expect(safeRedirect('/chats/1?x=2')).toBe('/chats/1?x=2');
    for (const bad of [
      '//site-malicioso.example',
      '/\\site-malicioso.example',
      'https://x.com',
      'javascript:alert(1)',
      '',
      null,
      undefined,
    ]) {
      expect(safeRedirect(bad)).toBeNull();
    }
  });
});

describe('cn', () => {
  it('ignora falsos', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});
