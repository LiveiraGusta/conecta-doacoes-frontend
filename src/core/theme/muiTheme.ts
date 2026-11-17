import { createTheme, type Theme } from '@mui/material/styles';
import type { ThemeColor } from '../types/api';
import { ACCENT, PALETTES, SURFACES } from './palettes';

/**
 * Tema do MUI gerado da mesma escolha do usuário (cor + claro/escuro) que pinta o Tailwind:
 * trocar o tema em Configurações muda os componentes do MUI e o layout juntos.
 * Visual do design: botões em pílula, sem sombra, texto sem caixa alta, DM Sans.
 */
export function createAppTheme(color: ThemeColor, dark: boolean): Theme {
  const p = PALETTES[color];
  const s = dark ? SURFACES.dark : SURFACES.light;

  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: p[600], light: p[400], dark: p[800], contrastText: '#ffffff' },
      secondary: { main: ACCENT, contrastText: '#ffffff' },
      error: { main: s.danger },
      success: { main: s.success },
      warning: { main: s.warning },
      background: { default: s.bg, paper: s.surface },
      text: { primary: s.fg, secondary: s.fgMuted },
      divider: s.border,
    },
    typography: {
      fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
      },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: 14, minWidth: 224 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
      // Links do React Router dentro de componentes do MUI (ListItemButton, MenuItem…) sem sublinhado.
      MuiLink: { defaultProps: { underline: 'hover' } },
    },
  });
}
