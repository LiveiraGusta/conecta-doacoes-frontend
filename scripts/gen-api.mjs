// Gera src/core/types/api.gen.ts a partir do openapi.yaml do backend (repositório irmão).
// Roda só na máquina de quem desenvolve: o CI e a Vercel não enxergam ../backend, por isso o arquivo é commitado.
// O openapi-typescript pede TypeScript 5 e o projeto usa a 6.0: ele roda isolado via npx, sem entrar no package.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backend = process.env.BACKEND_DIR ?? path.resolve(root, '../backend');
const spec = path.join(backend, 'docs/specs/openapi.yaml');
const out = path.join(root, 'src/core/types/api.gen.ts');

if (!existsSync(spec)) {
  console.error(`openapi.yaml não encontrado em ${spec}. Defina BACKEND_DIR com o caminho do backend.`);
  process.exit(1);
}

// No Windows o npx é um .cmd e precisa de shell; com shell, o Node não escapa os argumentos, então as aspas vão aqui.
const isWin = process.platform === 'win32';
const run = (cmd, args, cwd = root) =>
  isWin
    ? execFileSync([cmd, ...args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))].join(' '), {
        cwd,
        encoding: 'utf8',
        shell: true,
      })
    : execFileSync(cmd, args, { cwd, encoding: 'utf8' });

run('npx', ['-y', '-p', 'openapi-typescript@7.13.0', '-p', 'typescript@5.9.3', 'openapi-typescript', spec, '-o', out]);

let origin = 'desconhecido';
try {
  const commit = run('git', ['rev-parse', '--short', 'HEAD'], backend).trim();
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], backend).trim();
  const dirty = run('git', ['status', '--porcelain', '--', 'docs/specs/openapi.yaml'], backend).trim()
    ? ' (com alterações locais)'
    : '';
  origin = `${branch}@${commit}${dirty}`;
} catch {
  // backend sem git: mantém "desconhecido"
}

const header = `/**
 * ARQUIVO GERADO — não edite à mão. Rode \`npm run gen:api\`.
 * Origem: backend/docs/specs/openapi.yaml em ${origin}.
 */
`;
writeFileSync(out, header + readFileSync(out, 'utf8'));
console.log(`Tipos gerados em src/core/types/api.gen.ts (origem: ${origin}).`);
