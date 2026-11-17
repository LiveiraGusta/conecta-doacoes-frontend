# Conecta Doações — estado atual e próximos passos

> Documento de passagem para continuar o trabalho em outra conversa. Atualizado em 17/11/2026.
> Cole este arquivo (ou o caminho dele) no início do novo chat.

## 1. Resumo

| Parte | Estado |
| --- | --- |
| **Frontend** (`C:\Workspace\connectDoacoes\frontend`) | As 9 fases do plano estão prontas e na `develop` (já no GitHub). Lint, tipos, build, 292 testes (Vitest + MSW), 8 testes ponta a ponta (Playwright) e orçamento de bundle passando. |
| **Backend** (`C:\Workspace\connectDoacoes\backend`) | Fase 0 (integração com o front) pronta e na `develop` (já no GitHub). Typecheck e 126 testes unitários passando em 17/11/2026. Testes de integração não rodados nesse dia. |
| **Integração real** | **Nunca testada.** O frontend só rodou contra os mocks do MSW, escritos a partir do `openapi.yaml`. |
| **Deploy** | Não feito. `main` atrás da `develop` nos dois repositórios (front: 30 commits; back: 11). |

**Resposta curta para "agora é só deploy?": não.** Falta testar front + back juntos (seção 4, passo 1) e preparar a produção (passo 3).

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
Doadora (Marina Souza), ONG aprovada (ONG Salvadora), ONG em análise (Instituto Novo Começo), ONG rejeitada (Casa Esperança), Admin. Há também Carlos (Campinas), Paula (Rio) e Casa do Bem (ONG ativa). A Cesta básica tem 3 ONGs interessadas; a Bicicleta tem conversa com 2 não lidas; há 1 denúncia aberta.

**Seed real do backend (`SEED_DEMO=true`)**: senha `Demo1234`.
`doadora@demo.conectadoacoes.local`, `ong.ativa@demo.conectadoacoes.local`, `ong.pendente@demo.conectadoacoes.local`. Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`.
⚠️ O seed real tem **menos dados** que o mock (sem ONG rejeitada, sem Casa do Bem, sem conversas/denúncias prontas).

## 4. O que falta (em ordem)

### Passo 1 — Integração front + back (o mais importante)

1. Subir o backend local (seção 3) e o front com `npm run dev` (sem mock).
2. Percorrer os fluxos com as contas do seed. Pontos de maior risco, porque o mock pode ter divergido da API:
   - **Sessão por cookie** (`cd_session`, httpOnly, `SameSite=Lax`) e header anti-CSRF `X-Requested-With` em toda escrita.
   - **WebSocket** (`ws://localhost:3333/api/v1/chats/ws`): `ready`, `subscribe`, `message.created`, `unread.updated`, `item.status_changed`; fechar com 4401/4403.
   - **Uploads multipart**: 3 fotos do item (ordem = capa primeiro), documento da ONG, avatar e banner.
   - Não lidas, marcar como lida, `?after=` no polling.
   - Códigos de erro (`ALREADY_INTERESTED`, `ITEM_NOT_AVAILABLE`, `CHAT_CLOSED`, `HAS_ACTIVE_NEGOTIATIONS`…) e `details[].path` nos formulários.
   - Página pessoal / rotas `/public/*` sem dados sensíveis para visitante.
   - Admin: `document_url` assinada (expira em 10 min) aparecendo no `<iframe>` da análise.
3. Corrigir o lado que estiver errado (o `openapi.yaml` é o contrato). Se o contrato mudar: `npm run gen:api` no front.
4. Opcional e recomendado: uma variante dos testes Playwright contra a API real (hoje eles entram pelo painel "Entrar como", que só existe no mock).
5. Rodar `npm run test:int` no backend.

### Passo 2 — Pendência local no backend

Há mudanças **sem commit** no backend que não foram feitas nas conversas do plano: log em arquivo com rotação (`src/core/logger.ts` novo, `pino-roll`, alterações em `src/app.ts`, `src/core/env.ts`, `.env.example`, `README.md`, `docs/DECISOES.md`, `.vscode/`). Decidir: commitar numa branch própria (ex.: `feat/log-arquivo`) ou descartar.

### Passo 3 — Produção

**Pré-requisito: domínio próprio** com `app.<domínio>` (front) e `api.<domínio>` (API). Sem isso o cookie de sessão e o WebSocket não funcionam entre sites: `*.vercel.app` está na Public Suffix List (ADR-13).

Backend (Render — `render.yaml` existe):
- [ ] Postgres de produção (pooler do Supabase, porta 6543) em `DATABASE_URL`.
- [ ] Supabase Storage: buckets `items` e `ngo-docs`; `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `JWT_SECRET` (≥ 32 caracteres: `openssl rand -base64 48`).
- [ ] `CORS_ORIGIN=https://app.<domínio>`, `APP_URL=https://app.<domínio>`.
- [ ] Resend: `RESEND_API_KEY` e `EMAIL_FROM` com domínio verificado.
- [ ] ⚠️ **Acrescentar ao `render.yaml`**: `COOKIE_SECURE=true` e `COOKIE_DOMAIN=.<domínio>` (hoje não estão lá). O comentário do `CORS_ORIGIN` ainda sugere `*.vercel.app`, o que contradiz o ADR-13.
- [ ] Rodar o seed só com o Admin (`npm run seed:prod`, sem `SEED_DEMO`).

Frontend (Vercel — `vercel.json` existe):
- [ ] Variável `VITE_API_URL=https://api.<domínio>/api/v1` (o WebSocket é derivado dela: `wss://…/chats/ws`).
- [ ] **CSP no `vercel.json`**: trocar o `connect-src 'self' https: wss: …` pelo domínio real da API (`https://api.<domínio> wss://api.<domínio> https://viacep.com.br https://servicodados.ibge.gov.br`). Conferir `img-src` e `frame-src` com o domínio do Supabase do projeto.
- [ ] Previews da Vercel (`*.vercel.app`) não terão login real: usar `VITE_USE_MOCKS=true` no ambiente Preview.

### Passo 4 — Publicar

- [ ] PR `develop → main` nos dois repositórios; CI verde (o do front tem os jobs `verificar` e `e2e`).
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
