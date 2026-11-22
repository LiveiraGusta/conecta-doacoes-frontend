// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ícones da interface são só do Material (@mui/icons-material). Emoji e setas/símbolos
 * digitados no texto aparecem diferentes em cada sistema e não seguem o tema.
 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|\u{FE0F}/u;
/** Setas e marcas usadas como ícone. Só nos textos da interface: nos comentários do código, setas são permitidas. */
const SYMBOL = /[\u{2190}-\u{21FF}\u{2713}-\u{2718}\u{2022}\u{2605}\u{2606}]/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx?|json|css)$/.test(name) && !name.endsWith('api.gen.ts') ? [full] : [];
  });
}

const offending = (list: string[], pattern: RegExp) =>
  list.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );

describe('ícones só do Material', () => {
  it('nenhum emoji no código, nos textos ou nos dados de demonstração', () => {
    expect(offending([...files('src'), ...files('e2e'), 'index.html'], EMOJI)).toEqual([]);
  });

  it('nenhuma seta ou símbolo usado como ícone nos textos da interface', () => {
    expect(offending(files('src/i18n'), SYMBOL)).toEqual([]);
  });
});
