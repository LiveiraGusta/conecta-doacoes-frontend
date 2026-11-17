// Orçamento de bundle (decisão da fase 8): mede o build em `dist/` e falha se passar dos limites.
// Inicial = o que o index.html carrega e pré-carrega (script de entrada + modulepreload). Tamanhos em gzip.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Limites em KB (gzip). Subir um limite é decisão consciente: registre no docs/DECISOES.md. */
export const BUDGET = {
  initialJs: 300,
  css: 12,
  lazyChunk: 60,
};

const dist = process.argv[2] ?? 'dist';
const kb = (bytes) => bytes / 1024;
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initial = [
  ...html.matchAll(/<script[^>]+src="\/?([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/?([^"]+\.js)"/g),
].map((m) => m[1]);
const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/?([^"]+\.css)"/g)].map((m) => m[1]);

const assets = readdirSync(join(dist, 'assets')).map((f) => `assets/${f}`);
const lazy = assets.filter((f) => f.endsWith('.js') && !initial.includes(f));

const initialKb = kb(initial.reduce((sum, f) => sum + gz(f), 0));
const cssKb = kb(css.reduce((sum, f) => sum + gz(f), 0));
const biggestLazy = lazy
  .map((f) => ({ f, size: kb(gz(f)) }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);

const rows = [
  ['JS inicial', initialKb, BUDGET.initialJs],
  ['CSS', cssKb, BUDGET.css],
  [`Maior chunk lazy (${biggestLazy[0]?.f ?? '-'})`, biggestLazy[0]?.size ?? 0, BUDGET.lazyChunk],
];

console.log('Orçamento de bundle (gzip):');
for (const [name, size, max] of rows) {
  console.log(`  ${size <= max ? 'ok ' : 'ERRO'}  ${name}: ${size.toFixed(1)} KB (limite ${max} KB)`);
}
console.log('  Inicial:', initial.map((f) => `${f.replace('assets/', '')} ${kb(gz(f)).toFixed(1)}`).join(', '));
console.log(
  '  Maiores lazy:',
  biggestLazy.map(({ f, size }) => `${f.replace('assets/', '')} ${size.toFixed(1)}`).join(', '),
);
console.log(
  `  (${assets.length} arquivos, ${(kb(assets.reduce((s, f) => s + statSync(join(dist, f)).size, 0)) / 1024).toFixed(2)} MB sem gzip)`,
);

if (rows.some(([, size, max]) => size > max)) {
  console.error('\nO bundle passou do orçamento. Veja o que cresceu ou ajuste o limite (scripts/check-bundle.mjs).');
  process.exit(1);
}
