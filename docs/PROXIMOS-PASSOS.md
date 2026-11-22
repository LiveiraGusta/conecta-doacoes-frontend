# Conecta Doações — estado atual e próximos passos

> Documento de passagem para continuar o trabalho em outra conversa. Atualizado em 18/11/2026.
> Cole este arquivo (ou o caminho dele) no início do novo chat.

## 1. Resumo

| Parte | Estado |
| --- | --- |
| **Frontend** (`C:\Workspace\connectDoacoes\frontend`) | As 9 fases prontas, mais a variante e2e contra a API real e a preparação para produção, na `develop` **local** (sem push). Lint, tipos, 300 testes (Vitest), 8 e2e mock, 5 e2e contra a API real e orçamento de bundle passando em 18/11/2026. |
| **Backend** (`C:\Workspace\connectDoacoes\backend`) | Fase 0, log em arquivo, validação de produção e CI na `develop` **local** (sem push). Lint, tipos, 138 unitários e 174 de integração passando em 18/11/2026. |
| **Integração real** | **Testada em 17–18/11/2026, sem divergência do `openapi.yaml`.** Sessão por cookie, CSRF, uploads multipart (ordem da capa), interesse, escolha de ONG, chat por REST e WebSocket (4401/4403), não lidas, cancelamento, doação concluída, denúncia, admin e rotas públicas. |
| **Deploy** | Não feito. O código está pronto; falta a infraestrutura que depende do dono (domínio, contas, segredos). |

**Resposta curta para "agora é só deploy?": sim, do lado do código.** Falta o Passo 3 (infraestrutura) e o Passo 4 (publicar).

## 2. Onde está cada coisa

### Repositórios

| | GitHub | Branch de trabalho |
| --- | --- | --- |
| Frontend | `LiveiraGusta/conecta-doacoes-frontend` | `develop` (uma branch por fase: `feat/feed`, `feat/chat`…, já mescladas) |
| Backend | `LiveiraGusta/conecta-doacoes-backend` | `develop` |

### Documentos que mandam

| Arquivo | Para quê |
| --- | --- |
| `backend/docs/specs/openapi.yaml` | Contrato da API (fonte da verdade). Tipos do front gerados dele (`npm run gen:api` → `src/core/types/api.gen.ts`). |
| `backend/docs/specs/Spec do Chat em Tempo Real — WebSocket.md` | Protocolo do WebSocket do chat. |
| `backend/docs/GUIA-INTEGRACAO-FRONTEND.md` | Fluxos F1–F12 do lado do front. |
| `backend/docs/adr/ADR-13-sessao-cookie.md` | Por que sessão por cookie httpOnly + domínio próprio. |
| `frontend/docs/specs/plano-frontend.md` | Plano completo do front (todas as decisões iniciais). |
| `frontend/docs/DECISOES.md` | **Toda decisão tomada, fase a fase** (quem decidiu e consequência). Ler antes de mudar algo. |
| `backend/docs/DECISOES.md` | O mesmo para o backend. |
| `frontend/docs/ilustracoes.md` | Ilustrações do unDraw usadas e como recolorir. |

### Stack do frontend

Vite 8, React 19, TypeScript, React Router 7 (data router, páginas lazy), TanStack Query 5, React Hook Form + Zod 4, i18next (pt-BR), MUI 9 para componentes + Tailwind 4 para layout, MSW 3 (mocks), Vitest, Playwright, react-easy-crop, @dnd-kit.

Estrutura: `src/core` (API, hooks, serviços, schemas, tema, tempo real) · `src/components` (UI e layout) · `src/features` (por domínio) · `src/pages` · `src/routes` · `src/mocks` (banco falso + handlers + WebSocket falso) · `e2e/` (Playwright).
Regra de lint: `core/` e `components/` não importam `features/`, `pages/` ou `routes/`.

## 3. Como rodar

### Frontend

```bash
npm run dev:mock      # app inteiro com dados falsos (MSW), sem backend — http://localhost:5173
npm run dev           # contra a API real em http://localhost:3333/api/v1 (VITE_API_URL)
npm run test:run      # Vitest (unitários e de página)
npm run test:coverage # com cobertura (≥ 80% em src/core, ≥ 60% geral)
npm run e2e           # Playwright, contra o build em modo mock (sobe sozinho na porta 4174)
npm run e2e:real      # Playwright contra a API real (precisa da API e do npm run dev rodando; só leitura)
npm run build && npm run size   # build + orçamento de bundle (JS inicial ≤ 300 KB gzip)
npm run lint && npm run typecheck && npm run format:check
```

### Backend

```bash
docker compose up -d          # Postgres dev (porta 5434) e de testes (5433)
npm run migrate
SEED_DEMO=true ADMIN_PASSWORD=<senha> npm run seed
npm run dev                   # API em http://localhost:3333 (Swagger ligado com SWAGGER_ENABLED=true)
node scripts/vitest.mjs run --project unit   # unitários (npm test abre em modo watch)
npm run test:int              # integração (usa o Postgres de testes)
```

### Contas

**Mock do frontend (`dev:mock`)**: botões "Entrar como" na tela de login. Senha de todas: `Demo1234`.
Doadora (Marina Souza), ONG aprovada (ONG Salvadora), ONG em análise (Instituto Novo Começo), ONG rejeitada (Casa Esperança), Admin. Há também Carlos (Campinas), Paula (Rio) e Casa do Bem (ONG ativa). A Cesta básica tem 3 ONGs interessadas; a Bicicleta tem conversa com 2 não lidas; há 1 denúncia de negociação aberta e as "Revistas antigas" do Carlos estão ocultas com 3 denúncias de anúncio.

**Seed real do backend (`SEED_DEMO=true`)**: senha `Demo1234`.
`doadora@demo.conectadoacoes.local`, `ong.ativa@demo.conectadoacoes.local`, `ong.pendente@demo.conectadoacoes.local`. Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`.
⚠️ O seed real tem **menos dados** que o mock (sem ONG rejeitada, sem Casa do Bem, sem conversas/denúncias prontas).

## 4. O que falta (em ordem)

### ✅ Passo 1 — Integração front + back (feito em 17–18/11/2026)

- Fluxos percorridos pela API, pelo WebSocket e pelo navegador contra o backend local com o seed: **nenhuma divergência** do `openapi.yaml`.
- `npm run e2e:real` no front (5 testes, só leitura) e `npm run test:int` no backend (174) passando.
- Não verificado: entrega real do e-mail de recuperação (Resend) e a `document_url` assinada no `<iframe>` do admin. Conferir no teste de fumaça da produção.
- Comportamento confirmado e mantido: o logout só apaga o cookie; o JWT continua válido até expirar (7 dias), como descreve o ADR-13.

### ✅ Passo 2 — Log em arquivo (feito)

Commitado em `feat/log-arquivo` e mesclado; o aviso de depreciação do Fastify foi corrigido em `fix/log-logcontroller` (`logController`).

### Passo 3 — Produção

**Pré-requisito: domínio próprio** com `app.<domínio>` (front) e `api.<domínio>` (API). Sem isso o cookie de sessão não funciona entre sites: `*.vercel.app` e `*.onrender.com` estão na Public Suffix List (ADR-13).

Já feito no código (18/11/2026):
- [x] `render.yaml` com `COOKIE_SECURE=true` (sem ele a API não subia) e `COOKIE_DOMAIN` (opcional); comentário do `CORS_ORIGIN` corrigido.
- [x] Em produção a API **recusa subir** com config que quebraria o login: origem sem https, em `*.vercel.app`/`*.onrender.com`, com barra final, fora do `COOKIE_DOMAIN`, ou `APP_URL` fora do `CORS_ORIGIN`.
- [x] CSP de conexões gerada no build a partir do `VITE_API_URL` (não precisa editar o `vercel.json`).
- [x] Build de Production da Vercel falha sem `VITE_API_URL` válida (https, não localhost) ou com mocks ligados.
- [x] CI do backend (lint, tipos, unitários, integração com Postgres, build).
- [x] Boot de produção simulado a partir do `dist/`: cookie com `Secure`, CORS só na origem configurada, Swagger desligado.

Falta (depende do dono — passo a passo nos READMEs, seção "Deploy"):
- [ ] Registrar o domínio.
- [ ] Supabase de produção: Postgres (pooler, porta 6543), buckets `items` e `ngo-docs` (`npm run storage:check`).
- [ ] Resend: verificar o domínio para o `EMAIL_FROM` e criar a `RESEND_API_KEY`.
- [ ] Render: criar pelo Blueprint e preencher `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (`openssl rand -base64 48`), `CORS_ORIGIN` e `APP_URL` (`https://app.<domínio>`), `RESEND_API_KEY`, `EMAIL_FROM`; domínio `api.<domínio>` + DNS.
- [ ] Admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:prod` no Shell do Render (sem `SEED_DEMO`).
- [ ] Vercel: `VITE_API_URL=https://api.<domínio>/api/v1` em Production; `VITE_USE_MOCKS=true` em Preview; domínio `app.<domínio>` + DNS.

### Passo 4 — Publicar

- [ ] `git push` da `develop` nos dois repositórios (hoje só local).
- [ ] PR `develop → main` nos dois repositórios; CI verde (front: `verificar` e `e2e`; back: `verificar`, novo).
- [ ] Deploy e teste de fumaça em produção: cadastro de ONG, aprovação pelo Admin, publicar item, interesse, escolher ONG, conversa em tempo real, confirmar recebimento, recuperar senha por e-mail.

### Depois (não bloqueia o lançamento)

- `npm audit` no front aponta alertas *high* em dependência **de desenvolvimento** (`picomatch` via Vite, Vitest e lint-staged). A correção automática pede `--force`, com mudanças incompatíveis. Revisar quando houver versões novas.
- O teste de cadastro de ONG (`RegisterNgo.test.tsx`) já falhou de vez em quando no passado; ficou em observação.
- Notificação push com o app fechado (V2 na spec do chat).

## 5. Como o dono do projeto gosta de trabalhar

- Tudo em **português do Brasil** (código comentado, textos, commits).
- **Perguntar as decisões antes de cada fase** (com opções e uma recomendação) e só depois codar.
- **Branches e commits semânticos** (Conventional Commits em português, ex.: `feat(chat): …`), uma branch por fase, merge local `--no-ff` na `develop` ao fim. **Push só quando o dono pedir.**
- Registrar **toda decisão nova** no `docs/DECISOES.md` do repositório antes do commit.
- Verificar visualmente com capturas do Playwright (desktop e celular) antes de dar por pronto.
- Componentes do MUI (como no Angular Material) + Tailwind para layout; desktop e mobile com componentes separados quando a tela muda muito.

## 6. Sugestão de mensagem para o próximo chat

> Leia `C:\Workspace\connectDoacoes\frontend\docs\PROXIMOS-PASSOS.md`. Quero fazer o Passo 1: subir o backend local com o seed de demo e o frontend sem mock, testar os fluxos de ponta a ponta e corrigir o que divergir do `openapi.yaml`. Pergunte antes o que precisar decidir.
