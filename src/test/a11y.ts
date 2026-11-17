import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Roda o axe-core na tela e falha listando cada violação (regra, ajuda e onde).
 * No jsdom não há layout: contraste fica para a revisão no navegador (Playwright).
 */
export async function expectNoA11yViolations(container: Element = document.body) {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  const found = results.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(found).toEqual([]);
}
