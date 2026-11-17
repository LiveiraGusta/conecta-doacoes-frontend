# Registro de decisões: Conecta Doações (frontend)

Decisões do frontend e das mudanças no backend que ele exigiu. O plano aprovado está em [`specs/plano-frontend.md`](specs/plano-frontend.md).

**Como ler a coluna "Quem tomou":**

| Valor | Significado |
| --- | --- |
| **Usuário** | Escolha explícita do responsável pelo produto |
| **Claude (aprovado)** | Claude propôs e o usuário aprovou antes da implementação |
| **Claude** | Decisão técnica de Claude durante a implementação, relatada no fim da fase. Pode ser revista |
| **Spec** | Já estava definido nas specs ou no guia de integração e só foi seguido |
| **Revisão** | Ajuste vindo da revisão técnica do plano contra o código do backend, aprovado pelo usuário |

As decisões de backend também entram em `backend/docs/DECISOES.md` (seção "Integração com o frontend"). A sessão por cookie tem o ADR-13 no backend.

---

## Planejamento (2026-11-17)

### Fontes e regras

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | Fontes da verdade: `openapi.yaml`, a spec do WebSocket, o `GUIA-INTEGRACAO-FRONTEND.md` do backend e as telas em `docs/images/ui` | Usuário | Não se inventam campos nem rotas. Os campos novos (`notes`, perfil, preferências) entram primeiro no backend e no openapi |
| Plano | Quando a spec antiga do frontend (`spec-arquitetura-frontend.md`) diverge do guia do backend, vale o guia | Claude (aprovado) | Chat por WebSocket e não só polling; Material Icons e não Lucide |
| Plano | Perguntar cada decisão ao usuário e trabalhar fase a fase, com checkpoint ao fim de cada uma | Usuário | Cada fase começa com as perguntas em aberto e termina com revisão antes do commit |
| Plano | Ordem: backend primeiro (fase 0, em sub-fases), depois o frontend em fases | Usuário | O frontend pode começar depois da 0.1, usando MSW pelo contrato |

### Stack e estrutura

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | React 18 + TypeScript strict + Vite + React Router | Spec | — |
| Plano | TanStack Query para o estado do servidor | Usuário | Cache, invalidação após 409, scroll infinito e polling de fallback já prontos |
| Plano | React Hook Form + Zod nos formulários | Usuário | Os schemas espelham as regras do openapi. `details[].path` da API vai para `setError` |
| Plano | Estrutura de pastas da spec original: `core/ + components/ + features/ + pages/ + routes/` | Usuário | Mais camadas, mas segue o documento já existente |
| Plano | Tailwind CSS v4 | Usuário | Configuração em CSS (`@theme`, `@custom-variant dark`), sem `tailwind.config` |
| Plano | Ícones: `@mui/icons-material` | Usuário | Traz `@mui/material` e Emotion como dependências. Nenhum componente MUI é usado |
| Plano | Aceitar `style-src 'unsafe-inline'` na CSP por causa do Emotion | Usuário | O risco é baixo: só estilos inline, não scripts. A alternativa (`@material-symbols/svg-400`) foi recusada |
| Plano | Tipos da API gerados com `openapi-typescript` | Usuário | O arquivo diverge menos do contrato do que tipos escritos à mão |
| Plano | Gerar os tipos localmente e commitar `core/types/api.gen.ts`, com o commit de origem do backend no cabeçalho | Revisão | Os repositórios são separados: o CI e a Vercel não enxergam `../backend` |
| Plano | npm + ESLint + Prettier + Husky/lint-staged | Usuário | Mesmo gerenciador do backend. Lint e formatação rodam nos arquivos alterados a cada commit |
| Plano | i18n com `react-i18next`, só pt-BR por enquanto | Usuário | Textos em `src/i18n/pt-BR/*.json`. Os schemas Zod devolvem chaves de tradução. A `message` da API aparece como vem |
| Plano | DM Sans via `@fontsource/dm-sans`; sem PWA | Usuário | A fonte não é baixada do Google em runtime |

### Sessão e segurança (exigiu mudança no backend)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | Sessão em cookie httpOnly emitido pelo backend; no frontend, Context API | Usuário | O JS nunca vê o token. O estado da sessão é a query `GET /auth/me` |
| Plano | Só cookie: o Bearer deixa de ser aceito | Usuário | Os testes do backend mudam (o helper `authHeader` passa a mandar cookie). O `@fastify/jwt` usa `onlyCookie: true` |
| Plano | Login e cadastro devolvem só `{ user }`, sem `token` | Usuário | Muda o `AuthResponse` no openapi e no guia |
| Plano | Proteção CSRF: header `X-Requested-With` obrigatório em POST, PUT, PATCH e DELETE | Usuário | Conferido dentro do `authPlugin`. O Swagger UI ganha um interceptor. O CORS libera o header |
| Plano | WebSocket autentica pelo cookie no handshake e confere o `Origin`; sai a mensagem `{type:"auth"}` | Usuário | A spec do WebSocket muda. A rota continua `public` e valida dentro do handler, para o navegador ver 4401 e não 1006 |
| Plano | Front e API em domínios diferentes | Usuário | **Revista na linha abaixo** |
| Plano | Domínio próprio em produção: `app.<dominio>` + `api.<dominio>` (mesmo site), cookie `SameSite=Lax; Secure` | Revisão | Com domínios diferentes o Safari bloqueia o cookie, o rewrite da Vercel não repassa WebSocket e `*.vercel.app` está na Public Suffix List. Os previews da Vercel usam os dados falsos (`VITE_USE_MOCKS=true`) |
| Plano | `PATCH /profile/password` reemite o cookie da sessão atual | Claude (aprovado) | O usuário não precisa logar de novo após trocar a senha. As outras sessões continuam caindo |
| Plano | Nova rota `POST /auth/logout`, que limpa o cookie | Claude (aprovado) | Com cookie httpOnly, o cliente não consegue apagar a sessão sozinho |
| Plano | CORS com `exposedHeaders: ['x-request-id']` | Revisão | Sem isso o front cross-origin não lê o id do erro para mostrar na tela de erro |

### Funcionalidades novas (exigiram mudança no backend)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | Campo `notes` ("Observações do doador") no item, até 1000 caracteres | Usuário | Migração 007. Aparece no detalhe e não no card |
| Plano | Temas: 5 cores (Azul padrão, Verde, Roxo, Laranja, Rosa) × Claro/Escuro/Sistema, salvos no backend | Usuário | Tabela `user_preferences` e rotas `/profile/preferences`. Uma cópia no `localStorage` evita o flash na abertura |
| Plano | Página de configurações `/settings`: aparência e privacidade | Usuário | Separada de `/profile`, que fica com os dados da conta |
| Plano | Página pessoal `/u/:userId` para doador e ONG | Usuário | Novos campos de perfil, upload de avatar e banner, rotas `/users/:id` |
| Plano | Doador: nome abreviado, descrição, foto e só as doações concluídas, se ele ativar `show_donations` | Usuário | Com a opção desligada, `GET /users/:id/donations` devolve `200 { total: 0, data: [], hidden: true }` sem revelar se há doações |
| Plano | ONG: nome, descrição, ícone, banner, endereço, telefone/WhatsApp, Instagram, categorias aceitas e doações recebidas | Usuário | Migração 008 com os campos novos em `ngo_profiles` |
| Plano | Endereço da ONG por CEP, com autopreenchimento do ViaCEP | Usuário | Só o CEP sai para o ViaCEP. Se ele falhar, o preenchimento é manual. `viacep.com.br` entra no `connect-src` da CSP |
| Plano | Upload de avatar (1:1) e banner (3:1) com o mesmo editor das fotos | Usuário | Rotas `PUT`/`DELETE /profile/avatar` e `/profile/banner` (banner só para ONG) |
| Plano | Visitante sem login vê o feed de **todas as cidades**, o detalhe e um perfil parcial, sem nome nem foto de usuários; qualquer ação pede login | Usuário | Rotas `/public/*` com DTOs próprios e `additionalProperties: false`. Um teste de contrato garante que nenhum dado pessoal vaza |
| Plano | O "pedindo" das ONGs são as categorias que elas aceitam | Usuário | Não foi criado um módulo de pedidos |

### Interface e UX

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | UI bem diferente no desktop e no mobile: componentes `X.desktop.tsx` / `X.mobile.tsx` escolhidos por `useIsMobile()` | Usuário | A lógica fica em hooks compartilhados. Só se dividem os componentes que mudam muito (shell, categorias, card, detalhe, chat, admin, login) |
| Plano | Sidebar recolhível: 256 px ↔ 72 px (só ícones), lembrada no `localStorage` | Usuário | — |
| Plano | Detalhe do item na rota `/items/:id`: modal no desktop, página no mobile | Usuário | O link do item pode ser compartilhado |
| Plano | O seletor de localização do header abre um modal que faz `PATCH /profile` | Usuário | Trocar a cidade muda a conta e recarrega o feed |
| Plano | Avatar: foto, com fallback de iniciais em círculo colorido | Usuário | — |
| Plano | Categoria "Livros" entra na barra, mesmo ausente do design | Claude (aprovado) | `LIVROS` existe na API. "Comida" corresponde a `ALIMENTOS` |
| Plano | Login: 3/4 ilustração e 1/4 formulário. Cadastro: o inverso | Usuário | `AuthSplitLayout` com o lado configurável. No mobile, o formulário ocupa a tela cheia |
| Plano | Ilustrações do unDraw via `vite-plugin-svgr`, com a cor de destaque trocada por `currentColor` | Usuário | As ilustrações acompanham as 5 cores e o modo escuro |
| Plano | Snackbar próprio, no estilo do mat-snackbar, com Context | Usuário | Fila, um por vez, 4 s, ação "Desfazer" opcional. Sem dependência |
| Plano | Skeletons em todas as listas e detalhes | Usuário | Spinner só dentro de botões |
| Plano | Modais: base única com portal, foco preso e `Esc`; no mobile, bottom-sheet nos diálogos curtos | Usuário | A lista dos modais está no plano |
| Plano | Telas padrão: 404, 403, erro inesperado, sessão expirada, link inválido e offline | Usuário | — |
| Plano | Animações só com CSS/Tailwind, numa fase posterior (fase 9) | Usuário | Respeitam `prefers-reduced-motion` |
| Plano | Scroll infinito com `useInfiniteQuery` e botão "Carregar mais" como fallback | Usuário | Os itens são deduplicados por `id`, porque a paginação é por offset |
| Plano | Fotos do item: só validação no cliente, sem biblioteca de compressão | Usuário | O backend já converte para WEBP de até 1600 px |
| Plano | Editor de foto com `react-easy-crop` (corte, zoom e giro); inverter na horizontal/vertical via canvas | Usuário | Proporção fixa de 4:3 nas fotos do item |
| Plano | Fotos reordenáveis, com a 1ª como capa | Usuário | Nada muda no backend: ele já preserva a ordem do upload |
| Plano | Chat por WebSocket, com polling de 3 s quando ele cai | Spec | O badge de não lidas vem por `unread.updated` |

### Dados falsos, testes e entrega

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | Vitest + Testing Library + MSW | Usuário | — |
| Plano | Os mesmos dados falsos (MSW) servem aos testes e a `npm run dev:mock` | Usuário | O app inteiro roda sem backend, com o seletor "Entrar como". O WebSocket falso usa o `ws.link()` do MSW |
| Plano | Cobertura mínima de 80% em `src/core/` e 60% no geral, exigida no CI | Usuário | Ficam de fora `src/mocks/`, `*.gen.ts` e `main.tsx` |
| Plano | GitHub Actions (lint, typecheck, testes, build) + Vercel (preview por PR, produção na `main`) | Usuário | `vercel.json` com rewrite da SPA e CSP |
| Plano | Uma branch por fase (`feat/fase-N-…`), commit só após a aprovação, Conventional Commits em português | Usuário | — |
| Plano | Manter este arquivo atualizado a cada fase | Usuário | As decisões de cada fase entram numa seção nova antes do commit |

## Fase 0 — Backend (o que muda para o frontend)

O detalhe técnico está em `backend/docs/DECISOES.md`, na seção "Integração com o frontend".

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 0.1 | Uma branch por sub-fase no backend, a partir da `develop` (`feat/sessao-cookie`, `feat/observacoes-item`…) | Usuário | A 0.2 saiu da `feat/sessao-cookie`, porque a 0.1 ainda não está na `develop` |
| 0.1 | Requisição de escrita sem `X-Requested-With` → `403 CSRF_HEADER_MISSING` (código próprio, não `FORBIDDEN`) | Usuário | O cliente HTTP manda o header sempre. O código diferencia bug de integração de falta de permissão |
| 0.1 | `GET /auth/me` sem cookie continua `401`; o frontend trata como visitante | Usuário | O 401 do boot não dispara "sessão expirada". Só dispara quando já havia usuário logado |
| 0.1 | WebSocket com `Origin` ausente ou de outro site fecha com **4403**, não 4401 | Claude | O cliente de tempo real não reconecta com 4403 e não desloga o usuário. Só 4401 vira o fluxo de sessão expirada |
| 0.1 | Trocar a senha reemite o cookie: o frontend **não** reloga, só reconecta o WebSocket | Claude (aprovado) | O passo "relogar depois de trocar a senha" do guia antigo saiu |
| 0.2 | `notes` vem no `Item`/`ItemDetail` e não no `FeedItem`; visitante não vê | Usuário | O card não mostra observações. O detalhe mostra a seção "Observações do doador" só se `notes` não for `null` |

### Repositórios

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| Plano | No frontend, `main` e `develop` criadas a partir do primeiro commit (`docs/plano-frontend`) | Usuário | As branches das fases do frontend saem da `develop` |
### Sub-fase 0.2b-1 (backend): preferências e campos de perfil

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 0.2b-1 | Telefone vem só com dígitos e DDD (`11987654321`) | Usuário | O front aplica a máscara `(11) 98765-4321` e monta `https://wa.me/55<phone>` |
| 0.2b-1 | Instagram vem só como usuário (`ongsalvadora`) | Usuário | O front exibe `@ongsalvadora` e monta `https://instagram.com/<usuário>` |
| 0.2b-1 | Preferências chegam em `user.preferences` (no `/auth/me`, no login e no cadastro), com rota própria para alterar | Usuário | O `ThemeProvider` aplica o tema no boot sem chamada extra e faz `PATCH /profile/preferences` otimista |
| 0.2b-1 | Endereço da ONG só aparece para logados quando ela estiver `ATIVO` | Usuário | A página pessoal da ONG pendente ou rejeitada não mostra endereço (exceto para ela mesma) |
| 0.2b-1 | Endereço é um objeto `address` (ou `null`); o ViaCEP é consultado pelo front | Usuário | O formulário preenche rua e bairro pelo CEP e envia o objeto completo |
### Sub-fase 0.2b-2 (backend): foto de perfil e banner

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 0.2b-2 | A API corta ao centro e redimensiona (avatar 512×512, banner 1500×500) | Usuário | O editor do front recorta em 1:1 e 3:1 para o usuário escolher o enquadramento. Sem recorte, a API usa o centro |
| 0.2b-2 | Limite de 5 MB por imagem | Usuário | O `PhotoEditorModal` exporta WEBP bem abaixo disso. Mesmo assim, o front valida antes de enviar |
| 0.2b-2 | URLs em `user.avatar_url` e `user.ngo_profile.banner_url`; `null` = sem imagem | Claude | O `<Avatar>` usa a foto e cai nas iniciais quando for `null` |
