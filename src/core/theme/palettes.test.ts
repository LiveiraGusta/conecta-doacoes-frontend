// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ThemeColor } from '../types/api';
import { createAppTheme } from './muiTheme';
import { PALETTES, SURFACES } from './palettes';

/** Lê `--nome: valor` de um bloco do index.css. */
function cssVars(css: string, selector: RegExp) {
  const block = css.match(selector)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));
}

const css = readFileSync('src/styles/index.css', 'utf8');

describe('paletas: Tailwind (CSS) e MUI usam as mesmas cores', () => {
  it.each(Object.keys(PALETTES) as ThemeColor[])('%s', (color) => {
    const selector =
      color === 'AZUL'
        ? /:root,\s*\[data-theme-color='azul'\]\s*\{([^}]*)\}/
        : new RegExp(`\\[data-theme-color='${color.toLowerCase()}'\\]\\s*\\{([^}]*)\\}`);
    const vars = cssVars(css, selector);
    for (const [shade, hex] of Object.entries(PALETTES[color])) {
      expect(vars[`p-${shade}`], `${color} ${shade}`).toBe(hex);
    }
  });

  it('superfícies do claro e do escuro', () => {
    const light = cssVars(css, /:root\s*\{\s*color-scheme: light;([^}]*)\}/);
    const dark = cssVars(css, /:root\.dark\s*\{\s*color-scheme: dark;([^}]*)\}/);
    expect(light).toMatchObject({ bg: SURFACES.light.bg, surface: SURFACES.light.surface, fg: SURFACES.light.fg });
    expect(dark).toMatchObject({ bg: SURFACES.dark.bg, surface: SURFACES.dark.surface, fg: SURFACES.dark.fg });
  });
});

describe('createAppTheme', () => {
  it('botão no tom 600 da cor escolhida, com texto branco', () => {
    for (const color of Object.keys(PALETTES) as ThemeColor[]) {
      const theme = createAppTheme(color, false);
      expect(theme.palette.primary.main).toBe(PALETTES[color][600]);
      expect(theme.palette.primary.contrastText).toBe('#ffffff');
    }
  });

  it('modo escuro troca fundo e texto; fonte DM Sans e botão sem caixa alta', () => {
    const light = createAppTheme('VERDE', false);
    const dark = createAppTheme('VERDE', true);
    expect(dark.palette.mode).toBe('dark');
    expect(dark.palette.background.default).toBe(SURFACES.dark.bg);
    expect(light.palette.background.paper).toBe(SURFACES.light.surface);
    expect(light.typography.fontFamily).toContain('DM Sans');
    expect(light.typography.button.textTransform).toBe('none');
  });
});
