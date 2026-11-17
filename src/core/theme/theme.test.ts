import { describe, expect, it } from 'vitest';
import { setMatchMedia } from '@/test/setup';
import { applyTheme, DEFAULT_THEME, prefersDark, readStoredTheme, storeTheme, THEME_STORAGE_KEY } from './theme';

describe('readStoredTheme / storeTheme', () => {
  it('sem nada salvo, JSON quebrado ou valores fora da lista → padrão', () => {
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
    localStorage.setItem(THEME_STORAGE_KEY, '{quebrado');
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ color: 'AMARELO', mode: 'AUTO' }));
    expect(readStoredTheme()).toEqual(DEFAULT_THEME);
  });

  it('guarda e lê de volta', () => {
    storeTheme({ color: 'ROSA', mode: 'DARK' });
    expect(readStoredTheme()).toEqual({ color: 'ROSA', mode: 'DARK' });
  });

  it('storage que lança (modo privado) não quebra', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(readStoredTheme(broken)).toEqual(DEFAULT_THEME);
    expect(() => storeTheme(DEFAULT_THEME, broken)).not.toThrow();
  });
});

describe('applyTheme', () => {
  const root = () => document.documentElement;

  it('aplica a cor em minúsculas no data-theme-color', () => {
    applyTheme({ color: 'LARANJA', mode: 'LIGHT' });
    expect(root().dataset.themeColor).toBe('laranja');
    expect(root().classList.contains('dark')).toBe(false);
  });

  it('DARK liga a classe dark; LIGHT desliga', () => {
    applyTheme({ color: 'AZUL', mode: 'DARK' });
    expect(root().classList.contains('dark')).toBe(true);
    applyTheme({ color: 'AZUL', mode: 'LIGHT' });
    expect(root().classList.contains('dark')).toBe(false);
  });

  it('SYSTEM segue o prefers-color-scheme', () => {
    applyTheme({ color: 'AZUL', mode: 'SYSTEM' }, root(), true);
    expect(root().classList.contains('dark')).toBe(true);
    applyTheme({ color: 'AZUL', mode: 'SYSTEM' }, root(), false);
    expect(root().classList.contains('dark')).toBe(false);
  });

  it('prefersDark lê o matchMedia', () => {
    setMatchMedia((q) => q.includes('dark'));
    expect(prefersDark()).toBe(true);
    setMatchMedia(() => false);
    expect(prefersDark()).toBe(false);
  });
});
