// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * O script anti-flash do tema fica inline no index.html e a CSP do vercel.json só o libera pelo hash.
 * Mudou o script? Este teste mostra o hash novo para colocar no vercel.json.
 */
describe('CSP do vercel.json', () => {
  it('libera o script anti-flash pelo hash certo', () => {
    // Em LF, como o arquivo vai para a Vercel (.gitattributes): no Windows o checkout pode ter CRLF.
    const html = readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(inline, 'script inline do index.html').toBeTruthy();
    const hash = `'sha256-${createHash('sha256').update(inline!).digest('base64')}'`;

    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value;
    expect(csp, `atualize o script-src do vercel.json com ${hash}`).toContain(hash);
  });

  it('libera a prévia do documento da ONG (moderação) só do próprio site, blob/data e do storage', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')!.value;
    expect(csp).toContain("frame-src 'self' blob: data: https://*.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('o script anti-flash usa a mesma chave do localStorage que o ThemeProvider', async () => {
    const { THEME_STORAGE_KEY } = await import('@/core/theme/theme');
    expect(readFileSync('index.html', 'utf8')).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
  });
});
