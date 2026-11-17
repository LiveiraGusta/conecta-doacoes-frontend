import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeColor, ThemeMode } from '../types/api';
import { applyTheme, readStoredTheme, storeTheme, type ThemeState } from './theme';
import { ThemeContext } from './useTheme';

/**
 * Tema de cor + claro/escuro. Começa pelo localStorage (o script do index.html já pintou a tela com ele),
 * aplica no <html>, persiste a cada troca e acompanha o sistema quando o modo é SYSTEM.
 * Sincronizar com o backend (user.preferences e PATCH /profile/preferences) fica com quem usa o contexto.
 */
export function ThemeProvider({ children, initial }: { children: ReactNode; initial?: ThemeState }) {
  const [theme, setThemeState] = useState<ThemeState>(() => initial ?? readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme.mode !== 'SYSTEM' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(theme, document.documentElement, media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setColor = useCallback((color: ThemeColor) => setThemeState((t) => ({ ...t, color })), []);
  const setMode = useCallback((mode: ThemeMode) => setThemeState((t) => ({ ...t, mode })), []);
  const setTheme = useCallback((next: ThemeState) => setThemeState(next), []);

  const value = useMemo(() => ({ ...theme, setColor, setMode, setTheme }), [theme, setColor, setMode, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
