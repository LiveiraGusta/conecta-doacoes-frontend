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
### Sub-fase 0.2b-3 (backend): página pessoal e visitante

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 0.2b-3 | Contato e endereço só de ONG `ATIVO` (a própria ONG sempre vê) | Usuário | A página da ONG pendente mostra descrição, categorias e site, sem contato |
| 0.2b-3 | Visitante só vê o que está no feed: item `DOADO` e ONG não `ATIVO` dão 404 | Usuário | A tela 404 também cobre links públicos antigos |
| 0.2b-3 | `avatar_url` no card, no detalhe, nas interessadas e no chat | Usuário | O `<Avatar>` aparece em todo lugar onde há uma pessoa, com fallback de iniciais |
| 0.2b-3 | Página de Admin ou de conta excluída → `404 USER_NOT_FOUND` | Usuário | O front trata como "não encontrado" |
| 0.2b-3 | Rotas `/public/*` com rate limit por IP (60/min) | Claude | Visitante que rolar muito o feed pode receber 429. O scroll infinito trata com snackbar e nova tentativa |

## Fase 1a — Fundação

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 1a | React 19 + React Router 7 (modo biblioteca) | Usuário | A spec dizia "React 18+". O Router 8 já existe, mas ficou a 7 por escolha |
| 1a | Dados falsos da 1a: infraestrutura completa (db em memória, MSW no navegador e no Node, WebSocket falso) e só os handlers de `/auth` | Usuário | Cada fase seguinte acrescenta os handlers do seu domínio |
| 1a | Ilustrações do unDraw: placeholders agora, SVGs baixados pelo usuário depois | Usuário | A lista com os nomes sugeridos entra na fase 1b, junto com o `EmptyState` |
| 1a | TypeScript 6.0 (e não a 7) | Claude | O `typescript-eslint` ainda não suporta a 7. O backend também usa a 6.0 |
| 1a | `openapi-typescript` fora do `package.json`: o `gen:api` roda via `npx` com TypeScript 5 isolado | Claude | Ele exige TypeScript 5. Como o gerador só roda na máquina de quem desenvolve, não precisa entrar nas dependências |
| 1a | MSW 3: `setupWorker`/`setupServer` clássicos, com `public/mockServiceWorker.js`; a opção de requisição sem handler virou `onUnhandledFrame` | Claude | Funciona igual no `dev:mock` e nos previews da Vercel. O plugin novo `msw/vite` não foi usado |
| 1a | Sessão nos mocks: uma só, em memória (`db.loginAs`), no lugar do cookie | Claude | O mock imita o comportamento do cookie (login abre, logout fecha, `/auth/me` responde 401 sem sessão) e cobra o header anti-CSRF como a API |
| 1a | Testes de rede com upload rodam no ambiente `node` do Vitest (`// @vitest-environment node`) | Claude | No jsdom, um `FormData` com `File` chega quebrado ao `fetch` do Node interceptado pelo MSW ("content-length mismatch"). Componentes de upload (fases 2 e 4) vão conferir o `FormData` enviado sem depender disso |
| 1a | Vitest iniciado por `scripts/vitest.mjs` (letra do drive em maiúscula) | Claude | Mesma correção do backend para o Windows. Sem ela, o Vitest carrega duas cópias de si mesmo |
| 1a | Tokens de tema em CSS variables com `@theme inline`; botão sempre no tom 600 com texto branco | Claude | As 5 cores passam no contraste AA nos dois modos. No escuro, links e textos da cor usam o tom 300 |
| 1a | `useTheme` em arquivo próprio, separado do `ThemeProvider` | Claude | O hot reload do Vite só funciona em arquivo que exporta apenas componentes |
| 1a | Script anti-flash inline no `index.html`, liberado na CSP pelo hash; um teste confere o hash e a chave do `localStorage` | Claude | Se o script mudar (até pelo Prettier), o teste mostra o hash novo para o `vercel.json` |
| 1a | CSP com `connect-src https: wss:` por enquanto | Claude | O domínio da API ainda não existe. Trocar pelo `api.<domínio>` quando ele for definido |
| 1a | `docs/` fora do Prettier | Claude | Ele realinharia as tabelas largas dos documentos a cada edição |
| 1a | Página provisória `FoundationPage` (sessão + troca de tema) | Claude | Sai na fase 1b, quando entram o `AppShell` e as rotas |

## Fase 1b — Shell, rotas e componentes base

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 1b | Merge local da `feat/fundacao` na `develop` (sem push); a 1b sai da `develop` | Usuário | Mesmo fluxo do backend |
| 1b | Rotas com `createBrowserRouter`, páginas `lazy` e `errorElement` na raiz; guards como rotas de layout (`RequireAuth`, `RequireRole`, `PublicOnly`) | Usuário | O 403 aparece dentro do shell. O erro inesperado aparece fora dos providers |
| 1b | Menu do avatar (Minha página, Editar perfil, Configurações, Sair) no header; Sair também no rodapé da sidebar; no mobile, a BottomNav mantém os 4 ícones | Usuário | Fiel ao design |
| 1b | Avatar de iniciais com uma paleta fixa de 8 cores, escolhida pelo hash do id | Usuário | A mesma pessoa tem sempre a mesma cor, em qualquer tema |
| 1b | Sair pede confirmação ("Deseja sair?") | Spec (plano) | `useLogoutConfirm`, usado no menu e na sidebar |
| 1b | Sessão expirada vira snackbar + login com `?redirect=`, e não uma tela própria | Claude | Só quando havia usuário logado. O 401 de visitante não avisa nada |
| 1b | `?redirect=` só aceita caminho interno (`/…`, sem `//` nem `/\`) | Claude | Evita *open redirect* depois do login |
| 1b | Contexto e hook do snackbar e do "Entre para continuar" em `core/feedback`; a parte visual em `components/feedback` | Claude | O `AuthProvider` (em `core`) avisa a sessão expirada sem depender de UI |
| 1b | Componentes de formulário (Input, Select, FieldError) ficam para a fase 2 | Claude | Nascem junto com os primeiros formulários |
| 1b | Telas das fases seguintes são placeholders ("Esta tela chega na fase N") com rotas e guards funcionando | Claude | Cada fase troca o `lazy` da sua rota pela página real |
| 1b | Ilustrações: um placeholder SVG com `currentColor` e a lista dos 11 nomes do unDraw em `docs/ilustracoes.md` | Usuário (1a) | Basta salvar o SVG com o nome da lista e trocar o import em `Illustration.tsx` |
| 1b | `.gitattributes` com LF em todo o repositório; o teste da CSP calcula o hash sobre LF | Claude | No Windows, o checkout em CRLF mudava o hash do script inline |
| 1b | Raiz do Vite e alias `@` saem do mesmo caminho, com o drive em maiúscula | Claude | Sem isso, no Windows o dev server carregava módulos duas vezes (`/src/…` e `/@fs/c:/…`), e o contexto do `useAuth` quebrava no navegador. O build não era afetado |
| 1b | Bibliotecas em chunks próprios (`react`, `router`, `mui`, `vendor`) | Claude | O app tem 38 kB e as bibliotecas ficam em cache entre deploys. Some o aviso de chunk > 500 kB |
| 1b | Testes: `onlineManager.setOnline(true)` depois de cada teste | Claude | O TanStack Query guarda "offline" num singleton; um teste de offline pausava as queries dos testes seguintes |

## Fase 2 — Autenticação

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 2 | Cidade com UF em lista e sugestões do IBGE; ao sair do campo, a grafia vira a oficial; cidade fora da lista é recusada | Usuário | O feed compara a cidade exata: "Sao paulo" e "São Paulo" seriam cidades diferentes. Só a UF sai para o IBGE |
| 2 | Sem IBGE (rede ou fora do ar), a cidade digitada é aceita, com aviso | Claude | O cadastro não trava por causa de um serviço externo |
| 2 | Depois do cadastro, a ONG vê "Cadastro recebido" (`/bem-vindo-ong`) e depois o feed | Usuário | O banner de "em análise" continua no feed |
| 2 | Senha com mostrar/ocultar e checklist ao vivo (8+ caracteres, letra, número) no cadastro e na senha nova | Usuário | O login não mostra o checklist (a API responde só o erro genérico) |
| 2 | Documento da ONG em área de arrastar-e-soltar, com nome, tamanho, miniatura e trocar/remover; sem editor de corte | Usuário | Tipo e tamanho validados no cliente; a API confere de novo pelo conteúdo |
| 2 | CNPJ com máscara enquanto digita e dígitos verificadores conferidos no cliente | Claude | Mesma regra da API. Erros óbvios nem chegam a ela |
| 2 | Erros da API vão para os campos: `details[].path` (com alias, ex.: `new_password` → senha) e códigos como `EMAIL_TAKEN`, `CNPJ_TAKEN`, `INVALID_DOCUMENT`; o resto vira alerta no formulário | Claude | `applyApiError` em `core/utils`. "E-mail já cadastrado" mostra o link "Entrar com este e-mail" (`/login?email=`) |
| 2 | Cadastro com abas "Quero doar" / "Sou uma ONG" no `?tipo=` | Claude | Dá para mandar o link direto para ONGs (`/register?tipo=ong`) |
| 2 | "Entrar como" (5 contas) na tela de login, só com `VITE_USE_MOCKS=true` e por import dinâmico | Usuário (plano) | Os dados falsos não entram no bundle de produção |
| 2 | Destino pós-login guardado na sessão (`setUser(user, destino)`) e usado também pelo `PublicOnly` | Claude | Corrige um bug real: a ONG caía no `/feed` em vez de "Cadastro recebido". A navegação para a rota lazy roda numa transition do React Router 7, e o usuário gravado renderizava antes, fazendo o `PublicOnly` redirecionar para o início |
| 2 | Testes de formulário com upload substituem o serviço (`vi.mock`) e conferem o que o formulário entrega; o multipart em si é testado no ambiente `node` | Claude | Consequência da limitação do jsdom com `FormData` + `File` (fase 1a) |
| 2 | Tempo dos testes: `findBy` espera até 3 s e cada teste até 15 s | Claude | As páginas lazy e a digitação do user-event passavam do padrão em máquina lenta |

## Fase 1c — Componentes Material (MUI)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 1c | Usar os componentes do Material Design, como no Angular Material, no lugar dos componentes próprios em Tailwind | Usuário | Revê a decisão "Componentes próprios" do plano |
| 1c | Biblioteca: MUI (`@mui/material` 9), e não Material Web (`@material/web`) | Usuário | Já estava instalado por causa dos ícones. Material Web (M3) foi descartado: são Web Components, sem Autocomplete, Snackbar nem Skeleton |
| 1c | MUI nos componentes, Tailwind só no layout (grid, espaçamento, páginas) | Usuário | Os estilos do MUI ficam na camada CSS `mui`, antes das utilities do Tailwind (`StyledEngineProvider enableCssLayer` + `@layer theme, base, mui, components, utilities`). Um `className` de layout num componente do MUI funciona |
| 1c | Migrar agora tudo o que já existia (fases 1b e 2), antes do feed | Usuário | Branch `feat/material-ui`. O feed já nasce em MUI |
| 1c | Tema do MUI gerado da mesma escolha de cor e modo (`createAppTheme`), com as paletas em `core/theme/palettes.ts` | Usuário | Configurações muda o MUI e o Tailwind juntos. Um teste garante que as cores do CSS e do MUI não divergem |
| 1c | As APIs dos componentes do app (`Button`, `Modal`, `Menu`, `Avatar`, `Badge`, `TextField`…) foram mantidas, agora por cima do MUI | Claude | As telas mudaram pouco, e os testes de fluxo passaram sem alteração |
| 1c | Mapeamento: Dialog / Drawer de baixo (Modal), Menu, Snackbar, Skeleton, Avatar, Chip (Badge), TextField, select nativo, Autocomplete (cidade), Tabs, Drawer permanente (sidebar), AppBar, BottomNavigation, Alert (avisos e erros) | Claude | A área de arrastar-e-soltar do documento continua própria, montada com peças do MUI (o MUI não tem uma pronta) |
| 1c | Visual do design no tema: botões em pílula, sem sombra, sem caixa alta, DM Sans, cantos de 12 px | Claude | Ajustes em `components` do tema, não em cada tela |
| 1c | MUI 9 sem *system props*: `fontWeight` e afins vão no `sx` | Claude | Ex.: `<Typography sx={{ fontWeight: 700 }}>` |
| 1c | Cor do avatar de iniciais em estilo inline | Claude | Fixa por pessoa e fácil de testar |
| 1c | Testes adaptados ao MUI: snackbar com `role="alert"`, animações de saída (esperar a remoção), foco inicial no painel do Dialog, tooltip ao passar o mouse | Claude | Só 9 dos 138 testes precisaram de ajuste |
| 1c | Tamanho: o chunk do MUI tem 362 kB (112 kB gzip) | Claude | Custo aceito ao trocar os componentes próprios. O código do app continua em 42 kB |
| 1c | Uma falha intermitente na primeira rodada com cobertura, logo depois de formatar; não se repetiu em 6 rodadas seguidas | Claude | Provável lentidão do primeiro carregamento das páginas lazy. Fica em observação |

### Revisão da 1c: inputs, ilustrações e animação

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 1c | **Bug corrigido:** campos sem borda, botões sem cor e rótulos sobrepostos no login e no cadastro | Usuário (apontou) / Claude (causa) | O Emotion, com `enableCssLayer`, injeta no topo do `<head>`, antes do CSS do Tailwind: a camada `mui` era declarada primeiro e ficava abaixo do reset do Tailwind. Agora a ordem das camadas é o 1º estilo do Emotion (`<GlobalStyles>` no `ThemeProvider`). Conferido com screenshots (desktop e mobile, Chromium headless) |
| 1c | As 10 ilustrações baixadas do unDraw entraram no app; `#6c63ff` trocado por `currentColor` e `width`/`height` fixos removidos | Usuário | Seguem a cor do tema e escalam com o layout. "Sem permissão" (403) continua com o placeholder até ter um arquivo próprio |
| 1c | No painel azul do login/cadastro, o destaque das ilustrações usa o tom 200 da cor do tema | Claude | Azul sobre azul sumia |
| 1c | Ilustrações flutuam devagar (6 s) com sombra suave; paradas com `prefers-reduced-motion` | Usuário | Classes `animate-float` e `illustration-shadow`. `<Illustration animated={false}>` desliga |
| 1c | `cn()` passa a usar `tailwind-merge` (com os tokens do tema) | Claude | Classes passadas por quem usa o componente vencem as padrão. Corrigiu a ilustração cortada no mobile (`h-36` perdia para `h-auto`) |
| 1c | E-mails longos do "Entrar como" com reticências | Claude | Não vazam da caixa no mobile nem no desktop |
| 1c | Testes: `findBy`/`waitFor` esperam até 5 s | Claude | O teste do cadastro de ONG falhou 2 vezes, sempre na 1ª rodada com cobertura depois de editar arquivos (máquina carregada); não reproduziu em 7 rodadas, nem com o cache limpo. Fica em observação |


## Fase 3 — Feed (logado e visitante)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 3 | Fotos dos itens do mock geradas localmente (SVG em `data:` com a cor e o ícone da categoria) | Usuário | Sem imagens de terceiros nem rede no `dev:mock`; cada foto mostra título e "foto n/3" |
| 3 | Filtros do feed na URL: `?categoria=roupas&busca=jeans` (português, minúsculas) | Usuário | Dá para compartilhar e voltar com o filtro. Trocar filtro usa `replace` (não enche o histórico). Valor desconhecido é ignorado |
| 3 | Carrossel de fotos: rolagem lateral com *snap* e bolinhas clicáveis | Usuário | Sem biblioteca. A bolinha atual é uma pílula branca (visível sobre qualquer foto) |
| 3 | Item em negociação: selo "Em negociação", sem botão de interesse; a ONG escolhida vê "Escolhida para você" + "Abrir conversa" | Usuário | Regra em `interestView()` (testada à parte) |
| 3 | Busca espera 400 ms sem digitar (Enter manda na hora); no desktop fica no header (portal), no mobile no topo da página | Claude | O shell oferece o espaço por contexto (`HeaderSlotContext`) com *callback ref*, sem `id` no DOM |
| 3 | Scroll infinito com `IntersectionObserver` e "Carregar mais" sempre visível como reserva; páginas de 12, repetidos removidos pelo `id` | Claude | Item novo publicado no meio da rolagem não aparece duas vezes |
| 3 | Visitante usa `/public/items` (todas as cidades, título "Doações de todas as cidades"); Admin também, porque `/items/feed` responde 403 para ele | Claude | Cache separado por modo (`['feed','auth'|'public',…]`) |
| 3 | Interesse otimista no feed e no detalhe ao mesmo tempo; erro da API volta o botão e mostra a `message` dela; códigos de "tela desatualizada" (`ITEM_NOT_AVAILABLE`, `ALREADY_SELECTED`, `ALREADY_INTERESTED`, `INTEREST_NOT_FOUND`) recarregam o item | Claude | Sucesso traz "Desfazer" no snackbar |
| 3 | Detalhe: modal sobre o feed no desktop quando aberto do feed (`location.state.background`, mantendo os filtros); página com voltar no mobile e no link direto | Claude | Fechar volta no histórico; link direto volta para `/feed` |
| 3 | Visitante no detalhe: sem doador e sem observações, com aviso "Entre para ver quem está doando" | Spec (0.2b-3) | `GET /public/items/:id` |
| 3 | Localização: clique no header (desktop) ou botão acima das categorias (mobile) abre o modal com UF + cidade do IBGE | Claude | `PATCH /profile`, atualiza o usuário e recarrega o feed logado |
| 3 | `LocationFields` e `useCities` saíram de `features/auth` para `components/ui/form` e `core/hooks` | Claude | Usados pelo cadastro e pelo shell; a regra "components não importa features" continua valendo |
| 3 | Datas: relativa no card desktop ("há 2 h", `Intl.RelativeTimeFormat`), completa no mobile ("01/10/2026, 23:32"), como nos designs | Claude | `core/utils/format.ts` |
| 3 | Mock: mais um doador (Rio de Janeiro) e mais uma ONG ativa (Casa do Bem); 14 itens em 3 cidades, nas 4 categorias e nos 3 status | Claude | Dá para ver o feed por cidade, o visitante, o selo de negociação e a ONG escolhida |
| 3 | Testes: 38 novos (contrato dos mocks de itens, páginas, peças do feed e formatação); 184 no total | Claude | Conferido também com screenshots do `dev:mock` (desktop, modal, localização, visitante, mobile) |

## Fase 4 — Doações (publicar, minhas doações, interessadas)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 4 | Publicar em 3 etapas: Fotos → Dados → Revisar (Stepper do MUI) | Usuário | Um formulário só (React Hook Form); "Próximo" valida só os campos da etapa; erro da API volta para a etapa do campo |
| 4 | Reordenar fotos arrastando (`@dnd-kit`, também pelo teclado) **e** com setas + "Usar como capa" | Usuário | A 1ª é a capa; mudanças anunciadas para leitor de tela |
| 4 | Escolher ONG: confirmação → snackbar → navega para `chat_room_url` (a tela de conversa ainda é o placeholder até a fase 5) | Usuário | A fase 5 só troca a página de `/chats/:id` |
| 4 | "Minhas doações" / "Meus interesses" com abas por status e o número de cada uma; status na URL (`?status=` com `disponivel`, `negociacao` ou `doado`) | Usuário | A API não conta por status: uma consulta `limit=1` por aba lê o `total`. Tudo sob a chave `['myItems']` |
| 4 | Editor de foto com `react-easy-crop`, 4:3 fixo, zoom 1–3×, girar 90°, espelhar H/V; modal no desktop e tela cheia no celular | Spec (plano) | Espelho só em CSS na prévia; o arquivo final sai do `<canvas>` (`core/utils/image.ts`) |
| 4 | Foto final: até 1600 px no maior lado, WEBP 0,9 (JPEG se o navegador não gerar WEBP) | Claude | Fica bem abaixo dos 5 MB da API; o original pode ter até 20 MB porque é recomprimido |
| 4 | O original fica guardado junto da versão editada | Claude | "Editar" de novo parte do original, sem perder qualidade |
| 4 | A API não tem editar nem apagar item publicado | Spec (openapi) | A fase não tem essas ações; a revisão antes de publicar compensa |
| 4 | Sair do formulário com algo preenchido pede "Descartar esta doação?" (`useBlocker` + `beforeunload`) | Claude | Não perde fotos editadas por um clique no menu |
| 4 | Item publicado na cidade do doador (padrão da API), mostrado na revisão | Claude | Sem campo de cidade no formulário |
| 4 | Interessadas: ONG que não está mais ativa aparece com "ONG indisponível", sem "Escolher"; 403/404 viram "Esta doação não é sua" | Claude | Recusa de 409 (`ITEM_NOT_AVAILABLE`, `NGO_NOT_INTERESTED`, `NGO_NOT_ACTIVE`) mostra a mensagem e recarrega |
| 4 | "Meus interesses" usa o mesmo botão do feed; selos novos "Recebida pela sua ONG" e "Doado a outra ONG" | Claude | O interesse otimista também atualiza essa lista |
| 4 | `useInfiniteTrigger` saiu do FeedPage para `core/hooks` | Claude | Feed e listas de doações usam o mesmo scroll infinito |
| 4 | Mock: cesta básica com 3 interessadas (duas ativas e uma rejeitada); `POST /items` mostra as fotos enviadas de verdade (`blob:`) no `dev:mock` | Claude | Dá para ver a lista ordenada, a ONG indisponível e escolher |
| 4 | Prévias de arquivo com `useObjectUrl` (URL `blob:` compartilhada e com contagem de uso, liberada depois) | Claude | Corrige a miniatura quebrada no modo Strict (URL liberada no cleanup e reusada na nova montagem); vale também para o documento da ONG no cadastro |
| 4 | O `AppShell` monta a página uma vez só, num portal para um `div` fixo que a casca desktop ou mobile encaixa no `<main>` | Claude | Redimensionar a janela ou girar o tablet perto de 768 px troca a casca sem perder o que a página tinha (achado nas capturas do Playwright: a doação pela metade sumia) |
| 4 | Testes: 27 novos (contrato dos mocks de doações, editor de foto e schema, páginas de lista, interessadas e publicar, troca de casca); 211 no total | Claude | Conferido também com capturas do `dev:mock` (lista, interessadas, confirmação, editor, etapas, publicada, mobile e ONG) |

## Fase 5 — Chat em tempo real

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 5 | Envio otimista: a mensagem aparece na hora com "Enviando…"; se falhar, fica "Não enviada" com "Tentar de novo" e "Descartar" | Usuário | Pendentes ficam na sala (estado local); a resposta do POST entra no cache sem repetir a que chegar pelo WebSocket |
| 5 | Ações da sala: "Confirmar recebimento" visível no topo (só a ONG escolhida); "Ver item", "Denunciar" e "Cancelar negociação" no menu ⋮ | Usuário | Cancelar avisa "denuncie antes" com atalho "Denunciar primeiro" (depois do cancelamento a API recusa a denúncia) |
| 5 | Teclado: no desktop Enter envia e Shift+Enter quebra linha; no celular Enter quebra linha e o botão envia | Usuário | Respeita a composição de acentos (IME) |
| 5 | Avisos fora da sala aberta: contador na aba ("(3) Conversas · Conecta Doações"), snackbar "Nova mensagem de X" com "Abrir" e um som curto | Usuário | Som gerado com Web Audio (sem arquivo); pode ser desligado pela chave `cd:chat-sound` (a tela de configurações da fase 6 vai expor) |
| 5 | O aviso sai do `unread.updated` (chega de todas as conversas) quando o contador daquela conversa sobe, não do `message.created` (que só chega da sala inscrita) | Claude | Achado nas capturas: fora da sala o aviso não aparecia. Fora da tela de conversas, a lista é buscada para mostrar o nome |
| 5 | `RealtimeClient` próprio (sem biblioteca): `open` só depois do `ready`, salas inscritas de novo a cada `ready`, reconexão 1/2/5/10 s; 4401 vira sessão expirada e 4403 não reconecta | Spec (WS) | Testado com um WebSocket falso |
| 5 | `RealtimeProvider` dentro do RootLayout: um WebSocket por sessão de doador ou ONG; os eventos viram mudanças no cache (`['chat', id]`, `['chats']`, `['unread']`) | Spec (plano) | Visitante e Admin não abrem WebSocket |
| 5 | Sem WebSocket, a sala faz polling de 3 s com `?after=` e o badge, de 15 s; ao reconectar, salas, lista e badge são recarregados | Spec (guia §5) | Aviso discreto na sala: "Conexão em tempo real indisponível" |
| 5 | Lida ao abrir a sala, a cada mensagem recebida com a aba visível e ao voltar para a aba | Spec (WS) | Badge e lista zeram na hora |
| 5 | Desktop: lista e sala lado a lado, com a sala como rota filha de `/chats` (a lista não remonta); celular: telas separadas com voltar | Spec (plano) | Lista vazia na coluna estreita só com texto; a ilustração fica no painel da sala |
| 5 | Altura do chat medida (`useFillHeight`): header, banners e barra de baixo entram na conta | Claude | Achado nas capturas: com altura fixa o campo de mensagem ficava cortado no desktop |
| 5 | Lista de conversas sem paginação (uma página de 50) | Claude | Uma pessoa raramente tem tantas negociações abertas; a API aceita mais páginas se precisar |
| 5 | Mock: WebSocket falso com inscrições e eventos (o `RealtimeBus` em memória), 3 conversas no seed (uma com 2 não lidas, uma doada) e resposta automática da outra parte em 2 s no `dev:mock` | Claude | Os testes de página usam o mesmo WebSocket falso (MSW `ws.link`) |
| 5 | Testes: 22 novos (cliente WebSocket, contrato dos mocks do chat, páginas desktop/mobile, datas); 233 no total | Claude | Conferido também com capturas do `dev:mock` (lista, sala, resposta, menu, cancelar, aviso fora da sala, confirmar, doada, mobile) |

## Fase 6 — Perfil, página pessoal e configurações

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 6 | `/profile` em duas abas: "Minha página" (foto, banner, sobre, contato, categorias, endereço) e "Conta" (dados, situação da ONG, senha, excluir); aba na URL (`?aba=conta`) | Usuário | O banner da ONG rejeitada leva direto ao reenvio do documento |
| 6 | Cada seção tem o seu "Salvar", habilitado só quando algo mudou; foto e banner salvam ao aplicar o editor | Usuário | Um formulário (React Hook Form) por seção; erro da API no campo da seção |
| 6 | Doações na página pessoal em grade de miniaturas (capa, título, categoria), com "Ver mais" | Usuário | Visitante vê só o número; doador que ocultou mostra o aviso para os outros e a dica para ele mesmo |
| 6 | Configurações: cor e modo (salvos na conta), mostrar doações (doador), som e aviso de mensagem (só neste navegador) e atalhos | Usuário | Cor e modo mudam na hora e voltam se a API recusar |
| 6 | Editor de foto reaproveitado: 1:1 redondo para a foto de perfil, 3:1 para o banner | Spec (plano) | `PhotoEditorModal` ganhou `aspect`, `round`, `title` e `hint` |
| 6 | Endereço pelo CEP com ViaCEP (só o CEP sai do app); CEP não encontrado deixa preencher à mão; CEP de outra cidade avisa | Spec (plano) | A CSP já liberava `viacep.com.br`; mock do ViaCEP no MSW |
| 6 | Máscaras de telefone e CEP; Instagram aceita usuário, @ ou link e envia só o usuário | Claude | Mesmas regras do PATCH /profile da API |
| 6 | Contato da ONG: "Abrir no mapa" (busca no Google Maps por texto), "Ligar" e "WhatsApp" (`wa.me`) | Claude | Sem chave de API nem mapa embutido |
| 6 | Página pessoal: no celular avatar e texto empilhados; no desktop, só o avatar sobe para o banner | Claude | Achado nas capturas: no celular o nome quebrava letra a letra |
| 6 | Sair: marca que está saindo, deixa a página fechada antes, chama a API e só então limpa a sessão | Claude | Corrige dois problemas achados nos testes: excluir a conta (ou sair) numa página fechada mandava para o login, e um 401 em andamento virava "sessão expirada" |
| 6 | Excluir conta com negociação aberta mostra a mensagem da API com o atalho "Ver conversas" | Spec (guia F12) | |
| 6 | Mock: perfil completo, imagens, preferências, senha, exclusão, documento, `/users/:id(+donations)`, `/public/users/:id` e ViaCEP; banner gerado para a ONG Salvadora | Claude | |
| 6 | Testes: 28 novos (contrato dos mocks, máscaras e schemas, página pessoal, perfil, configurações); 261 no total | Claude | Conferido também com capturas do `dev:mock` (visitante, ONG, doadora, edição, CEP, conta, configurações claro/escuro, mobile, ONG rejeitada) |

## Ajustes depois da fase 6

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 6+ | Feed com até 5 cards por linha (1 → 2 → 3 → 4 → 5 conforme a largura); no card do desktop, categoria embaixo do título e botão na largura do card | Usuário | Cards menores; o selo "Escolhida para você" quebra linha em vez de cortar |
| 6+ | Login e cadastro no celular: faixa da ilustração na cor forte do tema, com a frase do app | Usuário | Antes era o tom claro (`primary-soft`), quase branco |
| 6+ | No `dev:mock`, CEP fora da lista do mock consulta o ViaCEP de verdade; nos testes continua "não encontrado" | Usuário | Ex.: 09910-470 (Diadema) passa a preencher |
| 6+ | Ilustração do 403 (`forbidden.svg`, enviada pelo usuário) recolorida com `currentColor`; placeholder removido | Usuário | Todas as ilustrações do plano estão no app |

## Fase 7 — Admin (moderação de ONGs e denúncias)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 7 | Documento da ONG em prévia dentro do modal de análise (`<iframe>`), ao lado dos dados, com "Abrir em nova aba" e "Recarregar documento" | Usuário | CSP ganhou `frame-src 'self' blob: data: https://*.supabase.co` (com teste); a fila é buscada de novo depois de 8 min, antes do link expirar |
| 7 | Aprovar pede confirmação ("Aprovar X?") | Usuário | A API não tem desfazer |
| 7 | Rejeitar com motivos prontos (Ilegível, CNPJ não confere, Outra entidade, Vencido ou incompleto) que preenchem o texto, editável; mínimo de 10 caracteres | Usuário | A ONG vê o texto e pode reenviar o documento |
| 7 | Detalhe da denúncia: atalho para a moderação da ONG denunciada, mensagens da denunciada destacadas e linha do tempo dos eventos do item | Usuário | O atalho (`/admin/ngos?ngo=`) acha a ONG em qualquer situação, procurando nas três filas |
| 7 | Filas com abas na URL (`?status=aprovadas`, `?status=resolvidas`), mais antigas primeiro, scroll infinito; tabela no desktop e cards no celular | Spec (plano) | A ficha da ONG também fica na URL (`?ngo=`): voltar fecha |
| 7 | Os blocos do detalhe da denúncia são regiões com nome (título ligado por `aria-labelledby`) | Claude | Achado nos testes |
| 7 | Mock: eventos dos itens (publicação, escolha, cancelamento, conclusão) registrados pelas rotas, documento gerado (cartão CNPJ em SVG) para as ONGs do seed, 2 denúncias (uma aberta, uma resolvida) | Claude | Documento enviado no cadastro ou no reenvio aparece de verdade no `dev:mock` |
| 7 | A tela "Em breve" (placeholders) saiu: todas as telas do plano existem | Claude | |
| 7 | Testes: 14 novos (contrato dos mocks do admin, páginas, CSP); 275 no total | Claude | Conferido também com capturas do `dev:mock` (fila, análise, rejeitar, aprovar, denúncias, detalhe, atalho, celular) |

## Fase 8 — Acabamento (acessibilidade, larguras, modo escuro, desempenho, e2e)

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 8 | Acessibilidade verificada com axe-core em 17 telas (`src/test/a11y.test.tsx`), mais revisão no navegador | Usuário | Contraste fica para o navegador (o jsdom não tem layout) |
| 8 | Corrigido o que o axe achou: barra lateral inteira num `<aside>` com nome e itens dentro de `<li>`; atalhos das configurações em `<li>`; o `role="log"` da conversa saiu do `<ol>` para uma `div` em volta | Claude | Leitores de tela anunciam a estrutura certa |
| 8 | Testes ponta a ponta com Playwright (`npm run e2e`): feed e interesse, publicar com o editor, escolher ONG e conversar, confirmar recebimento, moderação, celular | Usuário | Rodam contra o build em modo mock (`vite preview`), não o `dev:mock`: o servidor de desenvolvimento recarrega a página ao reotimizar dependências. Job próprio no CI |
| 8 | Revisão em 320, 768, 1024 e 1366 px, claro e escuro, com captura e detecção automática de rolagem lateral | Usuário | Corrigido: configurações e denúncia rolavam para os lados no celular |
| 8 | Entre 768 e 1023 px a barra lateral começa recolhida; abrir ali não muda a escolha salva para telas grandes | Claude | Antes os cards do feed ficavam com ~120 px e a conversa quebrava palavra por palavra |
| 8 | Grade do feed por container query (largura da área do feed, não da tela) | Claude | Com a barra aberta ou fechada, sempre cards de ~190 px ou mais |
| 8 | Tabelas do admin escondem uma coluna secundária abaixo de 1280 px (data de cadastro / data da denúncia) | Claude | Em 1024 px o botão "Analisar" ficava cortado |
| 8 | Modo escuro: primária do MUI no tom 300 com texto escuro nos botões preenchidos | Claude | No escuro, o tom 600 sumia (item ativo da barra, botões de contorno e de texto) |
| 8 | Orçamento de bundle no CI (`npm run size`): JS inicial ≤ 300 KB, CSS ≤ 12 KB, maior chunk lazy ≤ 60 KB (gzip) | Usuário | Subir um limite é decisão registrada aqui |
| 8 | Sem chunk único para MUI e bibliotecas (só `react` e `router` separados) e modal de localização carregado só ao abrir | Claude | JS inicial de 378 para 280 KB gzip (−26%); editor de foto, arrastar, tabela e stepper só com a página que usa |
| 8 | `npm audit` aponta alertas em dependências de desenvolvimento (picomatch via Vite, Vitest e lint-staged) | Claude | Não corrigido agora: a correção automática exige `--force` com mudanças incompatíveis. Revisar quando houver versões novas |
| 8 | Testes: 17 de acessibilidade + 8 ponta a ponta; 292 unitários e de página no total | Claude | |

## Fase 9 — Animações

| Fase | Decisão | Quem tomou | Consequência |
| --- | --- | --- | --- |
| 9 | Animações sutis: 150–250 ms, fade e deslize curtos, sem quique | Usuário | Tokens no `@theme` do Tailwind (`animate-fade-up`, `animate-msg-in-*`, `animate-pop`, `animate-confetti`) e utilitário `.lift` |
| 9 | Cards do feed entram em cascata (30 ms entre cada, no máximo 8 passos) e sobem 2 px no hover; listas (doações, interessadas, conversas, doações da página pessoal) entram com fade | Usuário | Itens que já estavam na tela não animam de novo |
| 9 | Troca de página: fade curto do conteúdo quando a seção muda (Feed → Doações…), pela Web Animations API no `div` fixo do AppShell | Usuário | Não remonta a página; dentro da mesma seção (`/chats` → `/chats/:id`) não anima. Sem View Transitions: exigiria `viewTransition` em cada link |
| 9 | Chat: mensagem que chega com a conversa aberta desliza do seu lado; as minhas já aparecem como pendentes e não deslizam de novo; "Enviando…" pulsa | Usuário | |
| 9 | Micro-interações: coração do "Tenho interesse" pulsa ao clicar; contador de não lidas dá um pulo quando muda | Usuário | |
| 9 | Doação concluída: modal com a ilustração "celebration" e confete em CSS (28 pedaços, sem biblioteca), só para a ONG que confirmou | Usuário | Substitui o snackbar dessa ação; o botão do rodapé é "Continuar" (o X do canto já se chama "Fechar") |
| 9 | Quem pede menos movimento no sistema (`prefers-reduced-motion`) não vê animação nem confete | Spec (plano) | Regra global no `index.css` |
| 9 | O `div` do conteúdo passou de `display: contents` para `block` | Claude | Precisa ter caixa para a animação de troca de página |
