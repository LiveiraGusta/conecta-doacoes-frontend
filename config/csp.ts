import type { Plugin } from 'vite';

/** Serviços públicos que o front chama direto (busca de CEP e lista de cidades). */
export const EXTERNAL_CONNECT = ['https://viacep.com.br', 'https://servicodados.ibge.gov.br'];

/**
 * `connect-src` restrito à API real, ao WebSocket dela e aos serviços públicos.
 *
 * O header do vercel.json deixa `connect-src` amplo (https: wss:) porque não sabe o domínio da API.
 * Esta política vai numa meta tag gerada no build a partir do VITE_API_URL. Com duas políticas,
 * o navegador aplica as duas (interseção): a meta só aperta, nunca libera mais que o header.
 */
export function connectSrc(apiUrl: string): string {
  const api = new URL(apiUrl);
  const ws = `${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}`;
  return ["connect-src 'self'", api.origin, ws, ...EXTERNAL_CONNECT].join(' ');
}

export interface BuildEnv {
  /** VITE_API_URL (vazio = o app cai no padrão http://localhost:3333/api/v1). */
  apiUrl?: string;
  /** VITE_USE_MOCKS === 'true': dados falsos do MSW, sem API real. */
  mocks: boolean;
  /** VERCEL_ENV: 'production' | 'preview' | 'development' (só existe no build da Vercel). */
  vercelEnv?: string;
}

/**
 * Erro de config que derrubaria o site em produção sem aviso: sem VITE_API_URL o app chamaria
 * http://localhost:3333. Só barra o build de produção da Vercel; local e CI seguem como antes.
 */
export function productionApiProblem({ apiUrl, mocks, vercelEnv }: BuildEnv): string | null {
  if (vercelEnv !== 'production') return null;
  if (mocks) return 'VITE_USE_MOCKS=true no ambiente Production da Vercel: os dados falsos iriam para o ar.';
  if (!apiUrl)
    return 'Defina VITE_API_URL no ambiente Production da Vercel (ex.: https://api.seudominio.com.br/api/v1).';
  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    return `VITE_API_URL inválida: ${apiUrl}`;
  }
  if (url.protocol !== 'https:') return `VITE_API_URL precisa de https em produção: ${apiUrl}`;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    return `VITE_API_URL aponta para a máquina local: ${apiUrl}`;
  return null;
}

/** Plugin do Vite: barra o build de produção com config errada e injeta a meta CSP de conexões. */
export function cspConnectPlugin(env: BuildEnv): Plugin {
  return {
    name: 'conecta:csp-connect',
    apply: 'build',
    buildStart() {
      const problem = productionApiProblem(env);
      if (problem) this.error(problem);
    },
    transformIndexHtml() {
      // Modo mock: o MSW atende as chamadas para a URL padrão; não há API para restringir.
      if (env.mocks || !env.apiUrl) return [];
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: connectSrc(env.apiUrl) },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
