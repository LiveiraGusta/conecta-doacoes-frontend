// Inicia o Vitest com a letra do drive em maiúscula (mesma correção do backend).
// No Windows, o terminal do VS Code abre em "c:\..." e o Vitest resolve módulos em "C:/...";
// com caixas diferentes ele carrega duas cópias de si mesmo ("failed to find the runner").
import { spawn } from 'node:child_process';
import path from 'node:path';

const cwd = process.platform === 'win32' ? process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase()) : process.cwd();
const bin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs'); // o pacote não exporta o bin

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
