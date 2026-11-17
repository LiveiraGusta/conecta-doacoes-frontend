# Plano — Frontend React do Conecta Doações (+ ajustes no backend)

> Aprovado em 2026-11-17.

## Contexto

O repositório `frontend/` está vazio (só `docs/`). O backend (Fastify, `C:\Workspace\connectDoacoes\backend`) já expõe 33 rotas REST (`docs/specs/openapi.yaml`) e um WebSocket de chat (`docs/specs/Spec do Chat em Tempo Real — WebSocket.md`), e o `docs/GUIA-INTEGRACAO-FRONTEND.md` descreve os fluxos F1–F12. O objetivo é construir o SPA em React seguindo o guia e o visual de `frontend/docs/images/ui` (desktop: sidebar + header azul + grid de 3 colunas; detalhe em modal; mobile: bottom nav + página de detalhe), com Tailwind, Material Icons e testes.

Duas decisões suas exigem mudar o backend **antes**: sessão por **cookie httpOnly** (em vez de Bearer) e o novo campo **`notes`** ("Observações do doador").

### Decisões já tomadas (por você)

| Tema | Escolha |
| --- | --- |
| Server state | TanStack Query |
| Sessão | Context API + cookie httpOnly emitido pelo **backend**; só cookie (Bearer removido); login/cadastro devolvem só `{ user }` |
| Domínios | **Domínio próprio** em produção: `app.<dominio>` (Vercel) + `api.<dominio>` (API) → mesmo *site*, cookie `SameSite=Lax; Secure`, funciona no Safari e no WS. Sem `Partitioned` (revisto após a revisão técnica) |
| CSRF | Header obrigatório `X-Requested-With` em métodos que alteram estado; Origin checado no WS |
| WS auth | Cookie lido no handshake + validação de Origin; sai a mensagem `{type:"auth"}` |
| Formulários | React Hook Form + Zod |
| Testes | Vitest + Testing Library + MSW |
| Estrutura | A da spec original (`core/ + features/ + pages/ + routes/`) |
| Ícones | `@mui/icons-material` |
| Componentes | **MUI (`@mui/material`)**, como no Angular Material; Tailwind só no layout (revisto na fase 1c, ver DECISOES) |
| Chat | WebSocket + polling de 3 s como fallback |
| Observações | Novo campo `notes` no backend |
| Localização no header | Modal que faz `PATCH /profile` e recarrega o feed |
| Avatar | Foto de perfil (upload) com **fallback** de iniciais em círculo colorido |
| Temas | 5 cores (Azul padrão, Verde, Roxo, Laranja, Rosa) × modo Claro/Escuro/Sistema, salvos no backend |
| Configurações | Página `/settings`: aparência + privacidade ("mostrar minhas doações") |
| Página pessoal | `/u/:userId`. Doador: nome abreviado, descrição, foto, doações concluídas (se ativado). ONG: nome, descrição, ícone, banner, endereço (CEP + ViaCEP), telefone/WhatsApp, Instagram, site, categorias aceitas, doações recebidas |
| Visitante (sem login) | Vê o feed **de todas as cidades**, o detalhe dos itens e perfis parciais, **sem nomes nem fotos de usuários**; qualquer ação → "Entre para continuar" |
| Fotos | Validar no cliente (3 fotos, JPG/PNG/WEBP, ≤ 5 MB), sem biblioteca de compressão; o editor exporta WEBP ≤ 1600 px |
| Detalhe do item | Rota `/items/:id`: modal no desktop, página no mobile |
| Ordem | Backend primeiro; frontend em fases, com checkpoint ao fim de cada uma |
| Login / cadastro | Split-screen: login = 3/4 ilustração + 1/4 formulário; cadastro = invertido (1/4 formulário à esquerda, 3/4 ilustração à direita) |
| Ilustrações | unDraw (SVG) |
| Feedback | Snackbar próprio (estilo mat-snackbar) + Context; skeletons nas listas |
| Mocks | MSW + fixtures servindo testes **e** `npm run dev:mock` (app inteiro sem backend) |
| Animações | CSS/Tailwind, numa fase posterior |
| Desktop × mobile | Componentes separados por dispositivo (`X.desktop.tsx` / `X.mobile.tsx`) escolhidos por `useIsMobile()`; dados e hooks compartilhados |
| Sidebar | Recolhível: 256 px (ícone + texto) ↔ 72 px (só ícones, tooltip, badge), preferência no `localStorage` |
| Editor de foto | `react-easy-crop` (corte, zoom, girar) + inverter H/V via canvas |
| Telas padrão | 404, 403 sem permissão, erro inesperado, sessão expirada, link inválido, offline |
| Tipos da API | Gerados com `openapi-typescript` **localmente** (`npm run gen:api` lendo `../backend/docs/specs/openapi.yaml`) → `core/types/api.gen.ts` **commitado**, com o commit de origem do backend no cabeçalho; `core/types/api.ts` reexporta com nomes amigáveis. O CI só usa o arquivo |
| Ícones × CSP | Mantido `@mui/icons-material`; aceito `style-src 'unsafe-inline'` por causa do Emotion |
| Tailwind | v4 (`@tailwindcss/vite`, `@theme` + `@custom-variant dark`) |
| Paginação | Scroll infinito (`useInfiniteQuery` + `IntersectionObserver`), botão "Carregar mais" como fallback; admin também |
| Tooling | npm + ESLint + Prettier + Husky/lint-staged |
| Fotos do item | Editor 4:3 fixo + reordenar (1ª = capa) |
| Doações ocultas | `GET /users/:id/donations` → `200 { total: 0, data: [], hidden: true }` |
| Deploy/CI | GitHub Actions (lint, typecheck, test com cobertura, build) + Vercel (preview por PR, produção na `main`, `vercel.json` com rewrite SPA) |
| Git | Branch por fase (`feat/fase-N-…`), commit só após sua aprovação, Conventional Commits em PT |
| Idioma | pt-BR com `react-i18next` (`src/i18n/pt-BR/*.json` por domínio); mensagens do Zod também via i18n; erros da API exibidos como vêm |
| Cobertura | ≥ 80% em `core/`, ≥ 60% geral, exigida no CI |
| Ilustrações | unDraw via `vite-plugin-svgr`, cor de destaque trocada por `currentColor` (acompanha tema) |
| Fonte / PWA | DM Sans via `@fontsource/dm-sans`; sem PWA |

### Registro de decisões

- Criar **`frontend/docs/DECISOES.md`** no mesmo formato do `backend/docs/DECISOES.md` (colunas Fase · Decisão · Quem tomou · Consequência; "Quem tomou" = Usuário / Claude (aprovado) / Claude / Spec). Já nasce com todas as decisões desta conversa na seção "Planejamento".
- A cada fase, as decisões novas entram na tabela da fase antes do commit.
- No backend, as decisões da Fase 0 entram no `backend/docs/DECISOES.md` (seção nova "Integração com o frontend") + `ADR-13-sessao-cookie.md`.

> Este arquivo é a cópia aprovada do plano. O histórico das decisões está em [`../DECISOES.md`](../DECISOES.md).

> ⚠️ **Pré-requisito de produção:** um domínio próprio com os dois subdomínios. `*.vercel.app` está na Public Suffix List e o rewrite da Vercel não repassa WebSocket, por isso domínios separados não serviriam. Em dev não há problema: `localhost:5173` e `localhost:3333` são o mesmo *site*. Previews da Vercel (`*.vercel.app`) não terão login real; use `dev:mock` neles (`VITE_USE_MOCKS=true` no ambiente Preview).

---

## Fase 0 — Backend (cookie + notes)

Repositório: `C:\Workspace\connectDoacoes\backend`.

### 0.1 Sessão por cookie
- **Dependência:** `@fastify/cookie` em `src/app.ts`.
- **Ordem dos plugins:** `@fastify/cookie` **antes do `rateLimit`** (o `userRateLimitKey` lê `req.cookies`) e do jwt.
- **JWT só por cookie:** `jwt` com `cookie: { cookieName: 'cd_session', signed: false }` **e `verify: { onlyCookie: true }`** — sem isso o `@fastify/jwt` dá prioridade ao header `Authorization`.
- **Helper novo `src/core/session-cookie.ts`:** `cookieOptions()` num lugar só, usado por `setSessionCookie(reply, token)` e `clearSessionCookie(reply)` (limpar exige os mesmos atributos). `HttpOnly`, `Path=/api/v1`, `Max-Age` = 7 d, `SameSite=Lax`, `Secure` em produção, `Domain` opcional via env.
- **Env (`src/core/env.ts`):** `COOKIE_SECURE` (false dev / true prod), `COOKIE_DOMAIN` (opcional).
- **CORS:** `credentials: true`, `allowedHeaders: ['content-type','x-requested-with']`, **`exposedHeaders: ['x-request-id']`** (senão o front não lê o id do erro).
- **CSRF (dentro do `authPlugin`, sem hook separado):** POST/PUT/PATCH/DELETE em `/api/v1/*` sem `x-requested-with: XMLHttpRequest` → `403 FORBIDDEN` com mensagem própria; vale também para rotas públicas de auth e uploads. Swagger UI ganha `requestInterceptor` que adiciona o header.
- **Rotas de auth (`src/modules/auth/auth.controller.ts`, `auth.dto.ts`):**
  - `register/donor`, `register/ngo`, `login` → `Set-Cookie` + corpo `{ user }` (`AuthResponseDto` vira `{ user }`).
  - **Nova** `POST /auth/logout` (pública) → limpa o cookie, `204`.
- **Perfil (`src/modules/profile/profile.controller.ts`):**
  - `PATCH /profile/password` → continua derrubando as outras sessões, mas **reemite o cookie** da sessão atual (o frontend não precisa relogar). O `issuedBeforePasswordChange` já aceita token emitido no mesmo segundo.
  - `DELETE /profile` → limpa o cookie.
- **Rate limit:** `userRateLimitKey` passa a decodificar `req.cookies.cd_session`.
- **Logger:** redigir `req.headers.cookie` (`app.ts`, lista `redact`).
- **Fotos:** a ordem já é preservada (`readMultipart` mantém a ordem; `items.repository.ts` grava `created_at` escalonado e lê `ORDER BY created_at, id`). Só um teste e2e novo garantindo `photos[0]` = 1ª parte.
- **WebSocket (`src/modules/chats/chats.ws.ts`):** a rota **continua `public: true`** (um 401 no upgrade viraria 1006 no navegador, nunca 4401) e valida dentro do handler: `Origin` contra `CORS_ORIGIN` (+ `localhost:5173` em dev) e o cookie (`findAuthContext` + `issuedBeforePasswordChange`). OK → `{type:"ready"}` imediato; falha → fechar `4401`. Remover o timer, `authTimeoutMs`, `WS_CLOSE.AUTH_TIMEOUT` e o tipo `auth` de `WsClientMessage` (`chats.dto.ts`).
- **Swagger:** `securitySchemes.cookieAuth { type: apiKey, in: cookie, name: cd_session }`.

### 0.2 Campo `notes`
- Migração `migrations/007_item_notes.sql`: `ALTER TABLE items ADD COLUMN notes TEXT NULL CHECK (char_length(notes) <= 1000)`.
- `src/modules/items/items.dto.ts` (campo opcional no multipart, `optionalText(1000)`), repository (insert/select) e DTO de `Item`/`ItemDetail`. O `FeedItem` não leva `notes` (o card não mostra).

### 0.2b Preferências, perfil pessoal e acesso de visitante

**Migração `008_profiles_preferences.sql`:**
- `users`: `bio TEXT NULL (≤ 500)`, `avatar_path TEXT NULL`.
- `ngo_profiles`: `banner_path`, `phone (≤ 20)`, `instagram (≤ 100)`, `accepted_categories category[] DEFAULT '{}'`, `cep CHAR(8)`, `street`, `number`, `complement`, `neighborhood` (todos opcionais).
- `user_preferences`: `user_id PK FK`, `theme_color` (`AZUL|VERDE|ROXO|LARANJA|ROSA`, padrão `AZUL`), `theme_mode` (`LIGHT|DARK|SYSTEM`, padrão `SYSTEM`), `show_donations BOOLEAN DEFAULT false`, `updated_at`.

**Rotas (módulo `profile` + novo módulo `users` + novo módulo `public`):**
| Rota | Acesso | O quê |
| --- | --- | --- |
| `GET /profile/preferences` · `PATCH /profile/preferences` | DONOR, NGO, ADMIN | cor, modo, `show_donations` (só doador) |
| `PATCH /profile` (estendido) | DONOR, NGO | + `bio`; ONG: + `phone`, `instagram`, `accepted_categories`, endereço (`cep`…`neighborhood`) |
| `PUT /profile/avatar` · `DELETE /profile/avatar` | DONOR, NGO | multipart `avatar`, 1:1, WEBP 512 px |
| `PUT /profile/banner` · `DELETE /profile/banner` | NGO | multipart `banner`, 3:1, WEBP 1500×500 |
| `GET /users/:userId` | logado | Perfil completo (doador com nome abreviado; ONG com tudo). ADMIN não tem perfil público |
| `GET /users/:userId/donations?limit&offset` | logado | Doador: itens `DOADO` se `show_donations` (senão `200 { total: 0, data: [], hidden: true }`); ONG: itens recebidos |
| `GET /public/items?category&search&limit&offset` | público | Feed de **todas as cidades**, `DISPONIVEL`/`EM_PROGRESSO`, sem `donor`, sem `interests_count` |
| `GET /public/items/:itemId` | público | Detalhe sem doador e sem `notes` |
| `GET /public/users/:userId` | público | Só `role`, cidade/UF, `bio`, `accepted_categories` e contagens; sem nome, foto, banner, endereço, telefone |

- `User` (em `/auth/me` e respostas de auth) ganha `avatar_url`, `bio` e `preferences`; `ngo_profile` ganha os campos novos. `FeedItem.donor`, `ItemDetail.donor`, `InterestedNgo` e `Counterpart` ganham `avatar_url`.
- Rotas públicas: `config.public = true`, rate limit por IP mais baixo (ex.: 60/min), resposta com DTO próprio (nunca reaproveitar o DTO logado, para não vazar campo).
- Upload reaproveita `core/multipart.ts` + `core/images.ts` (sharp) + `core/storage.ts`.

### 0.3 Testes do backend
- `test/e2e/auth-guard.test.ts`: passa a mandar `x-requested-with` sempre e `cookie: 'cd_session=invalido'` no lugar do Bearer; novo teste que fixa a **lista exata de rotas públicas** (auth, logout, health, ws, `/public/*`).
- Schemas públicos com `additionalProperties: false` no openapi, para o `expectContract` pegar campo vazado; `hidden` documentado em `/users/:id/donations`.
- `test/helpers/factories.ts`: `authHeader()` vira `{ cookie: 'cd_session=<jwt>', 'x-requested-with': 'XMLHttpRequest' }` (nome mantido para não tocar em todos os testes).
- `test/helpers/ws.ts`: `openWs(app, path, { headers: { cookie, origin } })` via `injectWS`.
- Testes novos: atributos do `Set-Cookie` no login; corpo sem `token`; logout limpa; sem `x-requested-with` → 403; troca de senha reemite cookie e o antigo cai; WS sem cookie → 4401, Origin inválido → 4401, cookie válido → `ready`; `notes` criado/lido e > 1000 → 400; preferências (padrões, PATCH, enum inválido → 400, `show_donations` negado a ONG); avatar/banner (tipo, tamanho, banner só ONG); `GET /users/:id` (doador abreviado, doações só se `show_donations`); rotas públicas **não** expõem nome/foto/endereço (teste de contrato que falha se aparecer campo extra).
- Ajustar `auth-guard.test.ts` (401 sem cookie) e o teste de contrato (`test/helpers/contract.ts`) com o openapi novo.

### 0.4 Documentação
- `docs/specs/openapi.yaml`: `AuthResponse` → `{ user }`, `cookieAuth`, rota `/auth/logout`, `notes` em `POST /items`/`Item`, header `X-Requested-With`, 403 de CSRF.
- `docs/specs/Spec do Chat em Tempo Real — WebSocket.md`: autenticação por cookie no handshake.
- `docs/GUIA-INTEGRACAO-FRONTEND.md`: 1.2, 1.6 (cliente com `credentials: 'include'`), F2, F12, seção 5 e armadilhas.
- `docs/adr/ADR-13-sessao-cookie.md`: por que cookie httpOnly, trade-offs cross-site/CSRF.

---

## Frontend — estrutura

**Stack:** Vite + React 18 + TypeScript strict, Tailwind CSS, React Router v6, TanStack Query, React Hook Form + Zod, `@mui/icons-material` (+ peers `@mui/material`, `@emotion/react`, `@emotion/styled`), Vitest + `@testing-library/react` + `@testing-library/user-event` + MSW + jsdom.

```text
src/
├── assets/
│   ├── logo.svg
│   └── illustrations/      SVGs do unDraw (ver "Ilustrações")
├── components/
│   ├── ui/                 Button, Input, Select, Textarea, FileInput, Modal, ConfirmDialog,
│   │                       Badge (categoria/status), Avatar (iniciais), Carousel (3 fotos + bullets),
│   │                       Spinner, Skeleton (+ ItemCardSkeleton, ChatListSkeleton, TableSkeleton),
│   │                       EmptyState (ilustração + texto + ação), Snackbar, FieldError
│   ├── feedback/           SnackbarProvider + useSnackbar()
│   └── layout/             AppShell, Sidebar, Header (busca + localização + avatar), BottomNav,
│                           AuthSplitLayout (imagem + formulário, lado configurável),
│                           LocationModal, NgoStatusBanner, AdminShell
├── mocks/                  db.ts (banco em memória), fixtures/, handlers/ (por domínio),
│                           browser.ts (msw/browser), node.ts (msw/node), realtime.ts (ws.link)
├── core/
│   ├── api/                http.ts (api(), ApiError), queryClient.ts, realtime.ts (cliente WS)
│   ├── services/           auth.ts items.ts interests.ts chats.ts profile.ts admin.ts reports.ts
│   ├── schemas/            Zod: senha, CNPJ, UF, item (3 fotos), perfil, denúncia…
│   ├── hooks/              useAuth, useFeed, useItem, useMyItems, useInterests, useChats,
│   │                       useChatRoom, useUnread, useRealtime
│   ├── types/              api.gen.ts (gerado e commitado) + api.ts (nomes amigáveis)
│   └── utils/              format.ts (data relativa "2h atrás", UF, categorias),
│                           apiErrors.ts (details[].path → setError do RHF)
├── features/
│   ├── auth/               LoginForm, RegisterDonorForm, RegisterNgoForm, ForgotForm, ResetForm
│   ├── feed/               CategoryBar, ItemCard, ItemDetail, InterestButton, SearchBox
│   ├── donations/          NewItemForm, PhotoPicker, MyItemList, InterestedNgoList
│   ├── chat/               ChatList, ChatRoom, MessageList, MessageInput, ConfirmReceipt, CancelDialog, ReportDialog
│   ├── profile/            ProfileForm, PasswordForm, DeleteAccount, NgoDocumentResend
│   └── admin/              NgoQueue, NgoReviewCard, ReportQueue, ReportDetail
├── pages/                  uma página fina por rota, compondo features
│   └── system/             NotFoundPage, ForbiddenPage, ErrorPage, SessionExpiredPage, OfflineBanner
├── routes/                 index.tsx, RequireAuth, RequireRole, PublicOnly
├── test/                   setup.ts (usa mocks/node.ts), render.tsx (providers + rota inicial + usuário logado)
├── App.tsx                 QueryClientProvider, AuthProvider, RealtimeProvider, Router
└── main.tsx
```

### Temas (cor + claro/escuro)

- **Tokens semânticos** em CSS variables, nunca cor fixa nos componentes: `--primary-50…900`, `--surface`, `--surface-alt`, `--fg`, `--fg-muted`, `--border`, `--accent` (badge de categoria). Tailwind mapeia para `bg-primary-600`, `bg-surface`, `text-fg`…
- Cor: `<html data-theme-color="azul|verde|roxo|laranja|rosa">` troca a escala `--primary-*`. Modo: classe `dark` no `<html>` (modo `SYSTEM` segue `prefers-color-scheme` com listener). As 10 combinações validadas para contraste AA.
- **Sem "piscar":** script inline no `index.html` lê `localStorage` e aplica antes do React. Depois do `/auth/me`, `ThemeProvider` adota `user.preferences` e grava no `localStorage`. Visitante usa só `localStorage`/sistema.
- Trocar no app → aplica na hora (otimista) + `PATCH /profile/preferences`; erro → volta e snackbar.
- Testes: `ThemeProvider` aplica atributos/classe, `SYSTEM` reage ao `matchMedia`, sincroniza com o usuário.

### Configurações (`/settings`)

- **Aparência:** 5 amostras de cor (círculo com check, mini-preview de card/botão) + segmento Claro / Escuro / Sistema.
- **Privacidade (doador):** "Mostrar minhas doações concluídas na minha página" (`show_donations`).
- Link "Ver minha página" e "Editar perfil". Desktop: seções lado a lado; mobile: lista estilo ajustes do celular.
- `/profile` continua com dados da conta (nome, cidade, senha, excluir conta) e ganha **edição da página pessoal**: foto (editor 1:1), banner da ONG (editor 3:1), descrição, telefone/WhatsApp (máscara), Instagram, categorias aceitas (chips), endereço com **CEP → ViaCEP** (`core/services/viacep.ts`, `https://viacep.com.br/ws/{cep}/json/`, só o CEP é enviado; falha → preenchimento manual; mock no MSW).

### Página pessoal (`/u/:userId`)

- **Doador:** avatar, nome abreviado, cidade/UF, descrição; se `show_donations`, contagem + grade de doações concluídas (paginada). Senão, "Este doador prefere não exibir suas doações".
- **ONG:** banner no topo com avatar sobreposto, nome, selo de status, descrição, categorias aceitas (badges), endereço + "Abrir no mapa" (Google Maps por texto), telefone/WhatsApp (link `wa.me`), Instagram, site, contagem e grade de doações recebidas.
- Links para ela: doador no card/detalhe, ONGs interessadas, cabeçalho do chat, avatar do header ("Minha página").
- Variantes `.desktop`/`.mobile` (desktop: banner largo + duas colunas; mobile: banner baixo, uma coluna).
- **Visitante:** mesma rota usa `GET /public/users/:id` → sem nome, foto, banner, endereço e contato ("Entre para ver mais").

### Modo visitante (sem login)

- Rotas `/feed`, `/items/:id` e `/u/:id` acessíveis sem login. Os hooks escolhem o serviço (`/public/*` × logado) pelo estado da sessão.
- Feed de visitante: todas as cidades, cidade exibida em cada card, sem filtro de localização. Doador aparece como "Doador" com avatar genérico.
- Header/sidebar do visitante: "Entrar" e "Criar conta" no lugar do avatar; Conversas/Doações/Perfil abrem o modal **"Entre para continuar"**, assim como "Tenho interesse" e qualquer ação. Após login, volta para onde estava (`?redirect=`).
- Raiz `/` → `/feed` para todos.

### Divisão desktop × mobile

- **`core/hooks/useIsMobile.ts`:** `matchMedia('(max-width: 767px)')` com listener (breakpoint `md` do Tailwind). Nos testes, um helper `setViewport('mobile'|'desktop')` faz o mock do `matchMedia`.
- **Padrão por componente que diverge:** `ItemCard.desktop.tsx` + `ItemCard.mobile.tsx` + `ItemCard.tsx` (wrapper que escolhe). Os dois recebem **as mesmas props** (tipo `ItemCardProps` no wrapper), então lógica e dados ficam fora deles.
- **Componentes divididos:**
  | Componente | Desktop (imagens desktop) | Mobile (imagem mobile) |
  | --- | --- | --- |
  | Shell | Sidebar recolhível + header azul alto (título, busca, localização, nome + avatar) | Header branco compacto (título + avatar) + `BottomNav` com 4 ícones |
  | CategoryBar | Faixa "Categorias" com ícones grandes e rótulo sublinhado | Chips com scroll horizontal |
  | ItemCard | Foto em cima, título + badge, doador, cidade, descrição, botão | Doador + data no topo, foto, badge + cidade, título, descrição |
  | ItemDetail | Modal centralizado sobre o feed | Página com voltar |
  | ChatView | Duas colunas (lista à esquerda, sala à direita) | Lista e sala em telas separadas |
  | Admin (tabelas) | Tabela | Lista de cards |
  | AuthSplitLayout | Split 3/4 + 1/4 | Formulário em tela cheia com ilustração pequena no topo |
- Primitivos (`Button`, `Input`, `Badge`, `Avatar`, `Modal`…) são únicos e responsivos via Tailwind.

### Sidebar recolhível (desktop)

- Estados: **expandida** (256 px: logo "Conecta Doações", ícone + texto) e **recolhida** (72 px: logo reduzido, só ícones com `title`/tooltip; o badge de não lidas vira um ponto com número sobre o ícone).
- Botão de alternar no topo da sidebar (`MenuOpen`/`Menu`); atalho `Ctrl+B` opcional. Estado em `useSidebar()` + `localStorage` (`try/catch`). Transição de largura (fase de animações).
- Itens: Feed, Conversas (badge), Doações, Perfil, Sair (rodapé). Admin: ONGs, Denúncias, Sair.

### Editor de foto (publicar item e documento da ONG em imagem)

- Dependência: `react-easy-crop`.
- `features/donations/PhotoEditorModal`: abre ao escolher cada foto. Controles: arrastar para posicionar, **zoom** (slider + pinça/scroll), **girar 90°**, **inverter horizontal/vertical**, **proporção fixa 4:3**, Restaurar, Cancelar, Aplicar.
- `core/utils/image.ts → renderCroppedImage(file, cropPixels, { rotation, flipH, flipV })`: desenha em `<canvas>` (rotação + `scale(-1, 1)` para flip), exporta `image/webp` (fallback `image/jpeg`) com qualidade 0.9, limitado a 1600 px no lado maior; devolve `File`. Garante ≤ 5 MB antes do upload.
- `PhotoPicker`: 3 slots com preview; cada slot tem "Editar", "Trocar" e "Remover"; reordenar (a 1ª é a capa).
- Desktop: modal; mobile: tela cheia com controles grandes embaixo.
- Teste: `renderCroppedImage` com canvas mockado (`vitest-canvas-mock`) verifica chamadas de `translate/scale/rotate`; teste de componente do fluxo escolher → editar → aplicar → preview.

### Telas padrão

| Tela | Quando | Conteúdo |
| --- | --- | --- |
| **404 Página não encontrada** | rota inexistente (`path="*"`), `ITEM_NOT_FOUND`/`NOT_FOUND` em detalhe | ilustração unDraw, "Página não encontrada", botões "Voltar" e "Ir para o feed" (ou login, se deslogado) |
| **403 Sem permissão** | role errado na rota (guard) ou `FORBIDDEN` em página | "Você não tem acesso a esta página", botão para a home do seu perfil |
| **Erro inesperado** | `errorElement` do router + `ErrorBoundary`; 5xx em página | ilustração, "Algo deu errado", `x-request-id` copiável, "Tentar de novo" |
| **Sessão expirada** | 401 global | snackbar "Sua sessão expirou" + redireciona ao login guardando `?redirect=` para voltar depois |
| **Link inválido** | `/redefinir-senha` sem token ou `INVALID_RESET_TOKEN` | "Pedir um novo link" |
| **Sem conexão** | `navigator.onLine === false` | banner fixo "Você está offline" (não bloqueia a tela) |

Todas existem nas versões desktop e mobile (mesmo componente, layout responsivo) e funcionam dentro e fora do `AppShell`.

### Pontos-chave do `core`
- **`http.ts`** (baseado no cliente de referência do guia, §1.6): `fetch(API + path, { credentials: 'include' })`, header `X-Requested-With: XMLHttpRequest` sempre, JSON vs `FormData` (sem `content-type` manual), `202/204` sem corpo, `ApiError(status, code, message, details, requestId)`. Em `401` fora de `/auth/*` dispara `onUnauthorized` (registrado pelo `AuthProvider`).
- **Sessão (`useAuth` / `AuthProvider`):** o estado é a query `['me']` (`GET /auth/me`). Sem token no JS. `refetchOnWindowFocus` nela cobre o F1.3 (ONG descobre aprovação ao focar). `logout()` → `POST /auth/logout`, `queryClient.clear()`, fechar WS.
- **`realtime.ts`:** cliente do guia §5 adaptado (sem mensagem `auth`; abre só com usuário DONOR/NGO; backoff 1/2/5/10 s; 4401 → fluxo de 401; 4403 não reconecta; `join/leave` com re-subscribe no `ready`).
- **`RealtimeProvider`** traduz eventos para o cache do Query:
  - `message.created` → acrescenta em `['chat', itemId]` com dedupe por `id`; se sala aberta e aba visível → `POST /chats/:id/read`.
  - `unread.updated` → `setQueryData(['unread'])` e o `unread_count` em `['chats']`.
  - `item.status_changed` → invalida `['chat', id]`, `['item', id]`, `['myItems']`; `unsubscribed(chat_closed)` → toast "A negociação foi cancelada" e sai da sala.
  - `connected` flag → `useChatRoom` liga `refetchInterval: 3000` com `?after=` quando desconectado.
- **Erros globais (§1.3 do guia):** 401 → login; 403 `NGO_NOT_APPROVED` → banner/perfil; 409 → snackbar + invalidar o recurso; 429 → snackbar e botão desabilitado alguns segundos; 5xx → snackbar com `x-request-id`. Sempre exibir `message` da API. Um `onError` padrão no `QueryClient` (mutations) chama o snackbar; o formulário trata `VALIDATION_ERROR` por campo.

### Cuidados de implementação (da revisão técnica)

- **Query keys separadas** por modo: `['feed','public',…]` × `['feed','auth',…]`; login → `invalidateQueries`, logout → `clear()`.
- **Scroll infinito por offset:** deduplicar por `id` no `select` do `useInfiniteQuery`; próxima página enquanto `offset + limit < total`.
- **Desktop/mobile:** dividir só os componentes da tabela; lógica em hooks (`useItemCard`, `useChatView`); testar a lógica uma vez e as variantes só por smoke test.
- **i18n + Zod:** schemas retornam **chaves** (`validation.password.min`), traduzidas no `FieldError`; a `message` da API é exibida como vem.
- **CSP no `vercel.json`:** `connect-src` API + `wss://api…` + `viacep.com.br`; `img-src 'self' data: blob:` + Supabase Storage; `style-src 'self' 'unsafe-inline'` (Emotion); hash do script anti-flash do tema em `script-src`.
- **Cobertura:** thresholds `src/core/**` 80% e global 60%, excluindo `src/mocks/**`, `*.gen.ts`, `main.tsx`.

### UX: snackbars, skeletons, modais, estados

- **Snackbar** (`useSnackbar().show({ message, variant: 'info'|'success'|'error', action?: { label, onClick } })`): fila, um por vez, 4 s, base central (no mobile acima da `BottomNav`), `role="status"`/`aria-live`. Usos: "Interesse registrado" (com **Desfazer** → `DELETE /interest`), "Item publicado", "ONG escolhida — abrindo a conversa", "Doação concluída", "Negociação cancelada", "Perfil atualizado", "Senha alterada", "Denúncia enviada", "ONG aprovada/rejeitada", "Link enviado" (esqueci a senha), "Conexão perdida — atualizando a cada 3 s" / "Conectado de novo".
- **Skeletons** (`animate-pulse`, mesmo tamanho do conteúdo final): grid do feed (6 cards), detalhe do item, meus itens, interessadas, lista de conversas, mensagens da sala, perfil, tabelas do admin. Spinner só em botões (`loading`).
- **Modais** (`Modal` base: portal, backdrop, `Esc`/clique fora fecha, foco preso e devolvido, scroll do body travado; no mobile vira bottom-sheet quando for diálogo curto):
  | Modal | Onde |
  | --- | --- |
  | Detalhe do item | feed (desktop; mobile vira página) |
  | Localização (cidade/UF) | header |
  | Confirmar escolha da ONG | interessadas |
  | Confirmar recebimento | sala (ONG) |
  | Cancelar negociação (motivo opcional + aviso "denuncie antes") | sala |
  | Denunciar (motivo 10–1000) | sala |
  | Trocar senha / Excluir conta (senha + consequências) | perfil |
  | Reenviar documento | perfil (ONG rejeitada) |
  | Rejeitar ONG (motivo ≥ 10) / ver documento | admin |
  | Logout ("Deseja sair?") | sidebar/perfil |
- **Estados vazios e erro** com ilustração: feed vazio, sem doações, sem interessadas, sem conversas, 404, erro inesperado (com `x-request-id`).

### Login e cadastro (split-screen)

- `AuthSplitLayout({ side: 'left' | 'right', illustration, children })`.
- **Login:** ilustração ocupa 3/4 à esquerda (fundo azul primário, ilustração + frase "Conectando quem doa a quem precisa"), formulário 1/4 à direita (logo, e-mail, senha, "Esqueci a senha", Entrar, link "Criar conta").
- **Cadastro:** invertido — formulário 1/4 à esquerda (abas "Quero doar" / "Sou uma ONG"; o formulário da ONG é maior, então a coluna rola sozinha), ilustração 3/4 à direita.
- Desktop: `grid-cols-4` (`col-span-3` + `col-span-1`, com `min-w` ~380 px no formulário para não espremer). Abaixo de `lg`: ilustração some ou vira faixa no topo; formulário em tela cheia.
- Esqueci/redefinir senha usam o mesmo layout.

### Ilustrações (unDraw)

- Baixar os SVGs em undraw.co e guardar em `src/assets/illustrations/` (licença do unDraw permite uso livre sem atribuição). Importadas como componente via `vite-plugin-svgr`, com a cor de destaque (`#6c63ff`) trocada por `currentColor`.
- Sugestões (nomes do catálogo do unDraw; confirmo um por um com você): login → *"Gifts"*/*"Charity"*; cadastro → *"Join"*/*"Community"*; feed vazio → *"Empty"*; sem conversas → *"Messages"*; ONG em análise → *"Waiting"*/*"Pending approval"*; doação concluída → *"Celebration"*; 404 → *"Page not found"*; erro → *"Server down"*; e-mail enviado → *"Mail sent"*.
- Como eu não consigo baixar e escolher o SVG certo por você sem ver, a fase 1 entrega os placeholders e uma lista; você baixa ou aprova cada um.

### Dados mockados (MSW)

- **`mocks/db.ts`:** banco em memória com seed determinístico (IDs fixos): doadora "Marina Souza" (Campinas/SP), outro doador, ONG ativa "ONG Salvadora", ONG pendente, ONG rejeitada (com motivo), admin; ~12 itens nas 4 categorias e nos 3 status (fotos em `public/mock-photos/`), interesses, 2 conversas `EM_PROGRESSO` (uma com não lidas) e 1 `DOADO`, 2 denúncias; avatares/banner/endereço/categorias nas ONGs, preferências por usuário (um doador com `show_donations`), itens em várias cidades para o feed de visitante, e respostas do ViaCEP.
- **`mocks/handlers/`** (auth, items, interests, chats, profile, admin, reports): implementam as regras do openapi — paginação `{ total, data }`, filtros, transições de status, códigos de erro (`ALREADY_INTERESTED`, `ITEM_NOT_AVAILABLE`, `CHAT_CLOSED`…), cookie simulado (sessão em memória), `?after=` no chat. Formato idêntico ao contrato para os testes pegarem divergências.
- **`mocks/realtime.ts`:** `ws.link()` do MSW 2.x (mesmo mock em testes e no browser), um WebSocket falso que emite `message.created`/`unread.updated` quando um handler grava mensagem (e uma "resposta automática" da outra parte após 2 s, para ver o tempo real).
- **Uso:** testes (`msw/node`, `server.use()` para sobrescrever casos de erro); `npm run dev:mock` (`VITE_USE_MOCKS=true` → `msw/browser` antes do `createRoot`), com um seletor rápido "Entrar como: Doadora / ONG ativa / ONG pendente / Admin" visível só nesse modo. 

### Rotas

| Rota | Quem | Fluxo |
| --- | --- | --- |
| `/login`, `/register` (abas Doador/ONG), `/forgot-password`, `/redefinir-senha?token=` | público | F2, F3 |
| `/feed` (+ `/items/:id` como modal sobre o feed via `location.state.background`) | visitante (parcial), DONOR, NGO | F7 |
| `/u/:userId` | visitante (parcial), logados | página pessoal |
| `/settings` | DONOR, NGO, ADMIN | temas e privacidade |
| `/donations` | DONOR: meus itens · NGO: meus interesses | F7.5, F8.1 |
| `/donations/new` | DONOR | F6 |
| `/donations/:itemId/interests` | DONOR dono | F8 |
| `/chats`, `/chats/:itemId` | DONOR, NGO | F9–F11 |
| `/profile` | DONOR, NGO | F4, F12 |
| `/admin/ngos`, `/admin/reports`, `/admin/reports/:id` | ADMIN | F5, F11 |

ONG pendente/rejeitada usa o app normalmente com o `NgoStatusBanner` (sem botão de interesse); o reenvio de documento fica no perfil. ADMIN usa um shell próprio, sem WS.

### Visual (dos mockups)
- Tokens no Tailwind: azul primário (~`#0057A8`), roxo do badge de categoria (~`#5B21F6`), fundo cinza (~`#E9EAEE`), fonte DM Sans (`@fontsource/dm-sans`).
- Categorias: Todos / Roupas / Comida (`ALIMENTOS`) / Brinquedos / **Livros** (`LIVROS` existe na API; adicionado à barra). Ícones MUI: `Checkroom`, `Restaurant`, `SportsEsports`, `MenuBook`, `Apps`.
- Desktop ≥ `md`: sidebar `w-64` (Feed, Conversas com badge de não lidas, Doações, Perfil), header azul com busca, localização e avatar; grid `md:grid-cols-2 lg:grid-cols-3`.
- Mobile: header compacto, categorias com scroll horizontal, 1 coluna, `BottomNav` fixa; detalhe em página com voltar.
- Card: carrossel de 3 fotos com bullets, título, badge, avatar + "Marina S." + tempo relativo, cidade, descrição truncada, botão "Tenho interesse" (só NGO `ATIVO` e item `DISPONIVEL`; vira "Desfazer interesse" com `has_user_interest`).
- Detalhe: idem + descrição completa + **"Observações do doador"** (`notes`, só se houver).

---

## Ordem de execução (com checkpoint e commit ao fim de cada uma)

Backend (cada sub-fase com migração, openapi, testes e DECISOES próprios):
- **0.1** cookie/CSRF/WS + openapi/guia/spec WS + ADR-13 → **0.2** `notes` → **0.2b-1** preferências + `bio` + campos da ONG (migração 008) → **0.2b-2** avatar/banner → **0.2b-3** `/users/:id(+donations)` + `/public/*`.
- O frontend pode começar depois da 0.1 usando MSW pelo contrato; a fase 3 depende de 0.2b-3 e a fase 6 de 0.2b-1/2.

## Fases do frontend

Ao começar cada fase, eu pergunto as decisões em aberto daquela fase antes de codar.

1. **1a — Fundação:** tooling (ESLint, Prettier, Husky), Tailwind v4 + tokens de tema, i18n, `http.ts`, tipos gerados, MSW (handlers + `ws.link()`), setup de testes e cobertura, CI. **1b — Shell:** rotas/guards, `AppShell` desktop/mobile, telas padrão, primitivos. Detalhe: Vite/TS/Tailwind/ESLint/Prettier, `.env` (`VITE_API_URL`, `VITE_USE_MOCKS`), `core/api`, `core/types`, `AuthProvider`, rotas e guards, `useIsMobile`, **tokens de tema + `ThemeProvider`** (todo componente já nasce com as variáveis), `AppShell` desktop (sidebar recolhível) e mobile (BottomNav), telas padrão (404, 403, erro, offline), componentes base (Modal, Snackbar, Skeleton, EmptyState), `mocks/` com db + handlers de auth e `dev:mock`, setup de testes.
2. **Auth** — `AuthSplitLayout`, login (3/4 imagem), cadastro invertido doador/ONG (upload de documento, máscara de CNPJ), esqueci/redefinir senha, logout. Ilustrações escolhidas com você.
3. **Feed (logado e visitante)** — modo visitante com `/public/items` e modal "Entre para continuar", categorias, busca (debounce), scroll infinito, card, detalhe modal/página, interesse otimista com tratamento de `ALREADY_INTERESTED`/`ITEM_NOT_AVAILABLE`/`ALREADY_SELECTED`, `LocationModal`.
4. **Doações** — publicar item (`PhotoPicker` com 3 previews e trava, `PhotoEditorModal` com corte/zoom/girar/inverter), meus itens/interesses com filtro de status, lista de interessadas e "Escolher" → navega para `chat_room_url`.
5. **Chat** — `realtime.ts` + `RealtimeProvider`, badge de não lidas, lista de conversas (abas Em andamento / Concluídas), sala (dedupe, `read` com aba visível, modo só leitura em `DOADO`), confirmar recebimento, cancelar (com aviso "denuncie antes de cancelar"), denunciar.
6. **Perfil, página pessoal e configurações** — `/u/:userId` (doador e ONG, logado e visitante), edição da página (avatar, banner, descrição, contato, categorias, endereço com ViaCEP), `/settings` (5 cores, claro/escuro/sistema, mostrar doações); editar nome/cidade/site, trocar senha (cookie reemitido pelo backend), excluir conta (`HAS_ACTIVE_NEGOTIATIONS` → link para conversas), status da ONG + reenvio de documento.
7. **Admin** — fila de ONGs com abas de status, abrir `document_url` (recarregar se expirar), aprovar/rejeitar (motivo ≥ 10); fila de denúncias, detalhe com mensagens e eventos, resolver.
Cada fase 3–7 entrega junto os handlers MSW do seu domínio, os skeletons das suas telas e os snackbars das suas ações.

8. **Acabamento** — revisão responsiva 320–1440 px, acessibilidade (foco no modal, labels, contraste), estados vazios/erro com ilustração, `npm run build`.
9. **Animações (CSS/Tailwind)** — modal (fade + scale; bottom-sheet slide-up no mobile), snackbar (slide + fade), skeleton com shimmer, hover/press nos cards e botões, troca de foto no carrossel, transição de página suave, mensagem nova entrando no chat, coração/“interesse” com micro-animação. Respeitar `prefers-reduced-motion`.

## Testes (frontend)

- **Unitários:** `http.ts` (erro → `ApiError`, 204 sem corpo, 401 chama `onUnauthorized`, header CSRF e `credentials`), `realtime.ts` com WebSocket falso (backoff, 4401 sem reconectar, re-subscribe no `ready`), schemas Zod (senha, CNPJ, 3 fotos/tipo/tamanho), `format.ts`, `apiErrors.ts`.
- **Desktop × mobile:** cada wrapper renderiza a variante certa com `setViewport`; páginas principais testadas nas duas. Sidebar alterna e persiste. Rota inexistente → 404; role errado → 403; erro lançado → ErrorPage.
- **Componentes de UX:** Snackbar (fila, auto-dismiss com fake timers, ação "Desfazer"), Modal (Esc, foco preso, devolução de foco), skeleton aparece durante loading e some com os dados.
- **Mocks:** testes dos próprios handlers (transições e erros batem com o openapi), para o `dev:mock` não mentir.
- **Componentes/páginas com MSW** (os mesmos handlers do `src/mocks`): login + erro `INVALID_CREDENTIALS`; cadastro com `details` por campo; guard por role; feed filtra por categoria e interesse otimista; publicar bloqueia sem 3 fotos; escolher ONG navega para a sala; sala deduplica mensagem vinda do POST e do WS e fica só leitura em `DOADO`; troca de senha; aprovar/rejeitar ONG.
- Scripts: `npm test`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`.

## Verificação ponta a ponta

1. Backend: `npm run lint && npm run typecheck && npm test && npm run test:int` (com `docker compose up -d`, `npm run migrate`, `npm run seed` com `SEED_DEMO=true`).
2. Frontend: `npm run lint && npm run typecheck && npm test && npm run build`.
3. Sem backend: `npm run dev:mock`, entrar com cada perfil pelo seletor e percorrer todos os fluxos (snackbars, skeletons com throttle de rede no DevTools, modais, estados vazios).
4. Manual com `npm run dev` nos dois: entrar como `doadora@demo…` e `ong.ativa@demo…` (senha `Demo1234`) em dois navegadores/perfis; no DevTools conferir cookie `cd_session` HttpOnly; publicar item → ONG curte → doadora escolhe → conversar em tempo real (badge atualiza) → derrubar o backend e ver o polling assumir → confirmar recebimento. Testar `ong.pendente@demo…` (banner, sem interesse) e o admin aprovando-a. Testar em viewport 375 px.
