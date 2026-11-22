import type { ThemeColor, ThemeMode } from '../types/api';

export interface ThemeState {
  color: ThemeColor;
  mode: ThemeMode;
}

export const THEME_COLORS: readonly ThemeColor[] = ['AZUL', 'VERDE', 'ROXO', 'LARANJA', 'ROSA'];
export const THEME_MODES: readonly ThemeMode[] = ['LIGHT', 'DARK', 'SYSTEM'];
export const DEFAULT_THEME: ThemeState = { color: 'AZUL', mode: 'SYSTEM' };

/**
 * Chave no localStorage. O script anti-flash do index.html lê a mesma chave antes do React subir:
 * se mudar aqui, mude lá também.
 */
export const THEME_STORAGE_KEY = 'cd-theme';

const isColor = (v: unknown): v is ThemeColor => THEME_COLORS.includes(v as ThemeColor);
const isMode = (v: unknown): v is ThemeMode => THEME_MODES.includes(v as ThemeMode);

/** Lê o tema salvo; qualquer problema (sem storage, JSON quebrado, valor antigo) cai no padrão. */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): ThemeState {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      color: isColor(parsed.color) ? parsed.color : DEFAULT_THEME.color,
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_THEME.mode,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme: ThemeState, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // modo privado ou storage bloqueado: o tema só não persiste
  }
}

/** O sistema prefere escuro? (SYSTEM segue isto.) */
export const prefersDark = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

/** Aplica no <html>: `data-theme-color` (escala da cor) e a classe `dark` (superfícies). */
export function applyTheme(
  theme: ThemeState,
  root: HTMLElement = document.documentElement,
  systemDark = prefersDark(),
) {
  root.dataset.themeColor = theme.color.toLowerCase();
  const dark = theme.mode === 'DARK' || (theme.mode === 'SYSTEM' && systemDark);
  root.classList.toggle('dark', dark);
}
