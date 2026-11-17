/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** URL base da API REST (ex.: http://localhost:3333/api/v1). */
  readonly VITE_API_URL?: string;
  /** "true" liga os dados falsos (MSW) no navegador: npm run dev:mock e previews da Vercel. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
