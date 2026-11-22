import type { ThemeColor } from '../types/api';

export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type Scale = Record<Shade, string>;

/**
 * Escalas das 5 cores do tema. As mesmas cores estão em src/styles/index.css (variáveis --p-*, para o Tailwind);
 * o teste palettes.test.ts garante que os dois lados não divergem.
 * Botões usam o 600 com texto branco: contraste AA nas 5 cores.
 */
export const PALETTES: Record<ThemeColor, Scale> = {
  AZUL: {
    50: '#eef5fc',
    100: '#d8e8f8',
    200: '#b4d1f0',
    300: '#82b2e4',
    400: '#4a8cd3',
    500: '#1f6dbf',
    600: '#0057a8',
    700: '#00478a',
    800: '#003a70',
    900: '#002f5c',
  },
  VERDE: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#059669',
    600: '#047857',
    700: '#065f46',
    800: '#064e3b',
    900: '#022c22',
  },
  ROXO: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#7c3aed',
    600: '#6d28d9',
    700: '#5b21b6',
    800: '#4c1d95',
    900: '#2e1065',
  },
  LARANJA: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#ea580c',
    600: '#c2410c',
    700: '#9a3412',
    800: '#7c2d12',
    900: '#431407',
  },
  ROSA: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#db2777',
    600: '#be185d',
    700: '#9d174d',
    800: '#831843',
    900: '#500724',
  },
};

/** Superfícies e estados por modo (as mesmas de --bg, --surface… no index.css). */
export const SURFACES = {
  light: {
    bg: '#e9eaee',
    surface: '#ffffff',
    surfaceAlt: '#f4f5f7',
    fg: '#1a1c23',
    fgMuted: '#5b6070',
    border: '#d6d8de',
    danger: '#b91c1c',
    success: '#15803d',
    warning: '#b45309',
  },
  dark: {
    bg: '#0f1115',
    surface: '#1a1d24',
    surfaceAlt: '#232731',
    fg: '#e8eaef',
    fgMuted: '#a3a9b6',
    border: '#2e333d',
    danger: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
  },
} as const;

/** Roxo do design para o badge de categoria (igual em todos os temas). */
export const ACCENT = '#6d28d9';
