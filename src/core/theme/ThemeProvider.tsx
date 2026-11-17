import { ThemeProvider as MuiThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ThemeColor, ThemeMode } from '../types/api';
import { createAppTheme } from './muiTheme';
import { applyTheme, readStoredTheme, storeTheme, type ThemeState } from './theme';
import { ThemeContext } from './useTheme';

/**
 * Tema de cor + claro/escuro, para os dois mundos:
 * - Tailwind: atributos no <html> (o script do index.html já pintou a tela com o tema salvo);
 * - MUI: tema gerado da mesma escolha, com os estilos na camada CSS `mui` (abaixo das utilities do Tailwind).
 * Persiste a cada troca e acompanha o sistema quando o modo é SYSTEM.
 * Sincronizar com o backend (user.preferences e PATCH /profile/preferences) fica com quem usa o contexto.
 */
export function ThemeProvider({ children, initial }: { children: ReactNode; initial?: ThemeState }) {
  const [theme, setThemeState] = useState<ThemeState>(() => initial ?? readStoredTheme());
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = theme.mode === 'DARK' || (theme.mode === 'SYSTEM' && systemDark);

  useEffect(() => {
    applyTheme(theme, document.documentElement, systemDark);
    storeTheme(theme);
  }, [theme, systemDark]);

  const setColor = useCallback((color: ThemeColor) => setThemeState((t) => ({ ...t, color })), []);
  const setMode = useCallback((mode: ThemeMode) => setThemeState((t) => ({ ...t, mode })), []);
  const setTheme = useCallback((next: ThemeState) => setThemeState(next), []);

  const value = useMemo(() => ({ ...theme, setColor, setMode, setTheme }), [theme, setColor, setMode, setTheme]);
  const muiTheme = useMemo(() => createAppTheme(theme.color, dark), [theme.color, dark]);

  return (
    <ThemeContext.Provider value={value}>
      <StyledEngineProvider enableCssLayer>
        <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
      </StyledEngineProvider>
    </ThemeContext.Provider>
  );
}
