import { createContext, useContext } from 'react';
import type { ThemeColor, ThemeMode } from '../types/api';
import type { ThemeState } from './theme';

export interface ThemeContextValue extends ThemeState {
  setColor(color: ThemeColor): void;
  setMode(mode: ThemeMode): void;
  /** Troca os dois de uma vez (ex.: ao receber `user.preferences` do /auth/me). */
  setTheme(theme: ThemeState): void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
