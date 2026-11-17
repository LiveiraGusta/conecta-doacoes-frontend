# Conecta Doações (frontend)

SPA em React que conecta doadores a ONGs. Consome a API do repositório irmão `../backend`.

- Plano e decisões: [`docs/specs/plano-frontend.md`](docs/specs/plano-frontend.md) e [`docs/DECISOES.md`](docs/DECISOES.md)
- Contrato da API: `../backend/docs/specs/openapi.yaml` e `../backend/docs/GUIA-INTEGRACAO-FRONTEND.md`

## Stack

React 19 · TypeScript 6 (strict) · Vite 8 · React Router 7 · TanStack Query · React Hook Form + Zod · Tailwind CSS 4 · Material Icons (`@mui/icons-material`) · i18next (pt-BR) · Vitest + Testing Library + MSW.

## Rodando

Requisitos: Node 22+ (24 em dev).

```bash
npm install

# Com o backend rodando em localhost:3333 (veja o README do backend)
npm run dev

# Sem backend: dados falsos no navegador (MSW)
npm run dev:mock
```

Abra http://localhost:5173. Contas dos dados falsos (senha `Demo1234`):

| Perfil         | E-mail                                    |
| -------------- | ----------------------------------------- |
| Doadora        | `doadora@demo.conectadoacoes.local`       |
| ONG aprovada   | `ong.ativa@demo.conectadoacoes.local`     |
| ONG em análise | `ong.pendente@demo.conectadoacoes.local`  |
| ONG rejeitada  | `ong.rejeitada@demo.conectadoacoes.local` |
| Admin          | `admin@demo.conectadoacoes.local`         |

## Scripts

| Script                     | O que faz                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `dev:mock` | Servidor de desenvolvimento (com a API real / com dados falsos)                                            |
| `npm run build`            | Checa os tipos e gera `dist/`                                                                              |
| `npm test`                 | Vitest em modo observação                                                                                  |
| `npm run test:coverage`    | Testes com cobertura (mínimo: 80% em `src/core`, 60% geral)                                                |
| `npm run lint` / `format`  | ESLint / Prettier                                                                                          |
| `npm run gen:api`          | Regera `src/core/types/api.gen.ts` a partir do `openapi.yaml` do backend (só local; o arquivo é commitado) |

O `pre-commit` (Husky + lint-staged) roda ESLint e Prettier nos arquivos alterados.

## Estrutura

```text
src/
├── core/         lógica sem UI: api (cliente HTTP), theme, schemas (Zod), types (gerados do openapi)
├── components/   UI reutilizável (ui/, layout/, feedback/)       ← fase 1b
├── features/     domínios: auth, feed, donations, chat, profile, admin
├── pages/        uma página por rota
├── routes/       rotas e guards por perfil                       ← fase 1b
├── mocks/        dados falsos (MSW): db em memória, handlers, WebSocket falso
├── i18n/         textos em pt-BR por domínio
├── styles/       Tailwind e tokens de tema (5 cores × claro/escuro)
└── test/         setup e helpers de teste
```

## Variáveis de ambiente

Veja [`.env.example`](.env.example). Em produção, frontend e API ficam no **mesmo site** (`app.<domínio>` e `api.<domínio>`): a sessão é um cookie httpOnly (ADR-13 do backend).
