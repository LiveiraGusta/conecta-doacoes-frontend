# Architecture Specification: Frontend Conecta Doações (MVP V1.0)

## 1. Visão Geral & Estratégia de Execução (Fast-Track 2 Dias)

Para garantir a entrega funcional do MVP dentro da janela de **2 dias**, a arquitetura do Frontend adota o modelo de **Single Page Application (SPA) Unificada e Responsiva**, evitando a complexidade de configuração de um Monorepo logo no início, mas mantendo o isolamento modular das camadas para permitir escalabilidade futura (como extração para um app Mobile dedicado ou React Native).

### Stack Tecnológica Principal
* **Core:** React 18+ com TypeScript (Strict Mode)
* **Build Tool:** Vite (inicialização rápida e HMR instantâneo)
* **Estilização:** Tailwind CSS (abordagem responsiva via *utility classes*)
* **Roteamento:** React Router DOM v6+
* **Gerenciamento de Estado & Cache:** TanStack Query (React Query) para estado assíncrono/server-state + Zustand ou Context API para sessão/autenticação.
* **Formulários & Validação:** React Hook Form + Zod (garantindo a regra de **exatamente 3 fotos** no client-side antes do envio).
* **Ícones:** Lucide React

---

## 2. Estrutura de Diretórios (`src/`)

A organização de pastas segue a separação por responsabilidade (**UI vs. Core**), permitindo que a equipe trabalhe nos componentes visuais sem acoplar regras de negócio ou chamadas HTTP.

```text
src/
├── assets/                  # Logos, imagens estáticas e favicons
├── components/              # Componentes de UI reutilizáveis
│   ├── ui/                  # Primitivos (Button, Input, Modal, Badge, Carousel)
│   └── layout/              # Estruturas de navegação (Sidebar, Header, BottomNav)
│
├── core/                    # Camada agnóstica de framework/UI (Fácil extração futura)
│   ├── api/                 # Cliente HTTP (Axios/Fetch com interceptors JWT)
│   ├── services/            # Chamadas tipadas aos endpoints (/auth, /items, /chats)
│   ├── schemas/             # Schemas Zod de validação (ex: createItemSchema)
│   ├── hooks/               # Custom Hooks de dados (useFeed, useChat, useAuth)
│   └── types/               # Interfaces TypeScript espelhando o banco de dados
│
├── features/                # Módulos funcionais por domínio do sistema
│   ├── auth/                # Login, Cadastro Doador e Cadastro ONG (Upload CNPJ)
│   ├── feed/                # Vitrine regional, filtro por categoria, card de item e modal
│   ├── donations/           # Criação de doação (trava de 3 fotos) e gestão de matches
│   ├── chat/                # Sala de conversa em tempo real (polling/websocket) e encerramento
│   └── admin/               # Backoffice de aprovação/rejeição de ONGs
│
├── pages/                   # Páginas conectadas às rotas (Composição das features)
├── routes/                  # Configuração de rotas públicas, privadas e por Role (RBAC)
├── App.tsx                  # Providers globais (QueryClient, AuthProvider, Router)
└── main.tsx                 # Entrypoint da aplicação
```

---

## 3. Estratégia de Responsividade (Desktop-First Adaptativo)

Como os protótipos visuais base foram desenhados com estrutura de **Sidebar lateral + Grid de 3 colunas**, o layout adotará o seguinte comportamento adaptativo via Tailwind CSS:

| Elemento de UI | Viewport Desktop (`>= 768px` / `md:`) | Viewport Mobile (`< 768px` / RNF-02) |
| :--- | :--- | :--- |
| **Navegação Principal** | Sidebar fixa à esquerda (`w-64`) com links: *Feed, Conversas, Doações, Perfil*. | Sidebar oculta (`hidden md:flex`). Substituída por uma **Bottom Navigation Bar** fixa na base da tela (`md:hidden`). |
| **Header Superior** | Barra azul contendo Logo, Input de Busca centralizado, Seletor de Cidade/Estado e Avatar do usuário. | Header compacto empilhado: Linha 1 (Logo + Localização + Avatar); Linha 2 (Input de Busca em largura total). |
| **Filtro de Categorias** | Barra horizontal com ícones grandes (*Todos, Roupas, Comida, Brinquedos, Livros*). | Lista horizontal com rolagem lateral suave (`overflow-x-auto flex-nowrap`). |
| **Grid de Doações (Feed)** | Grid de 3 colunas (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`). | Lista vertical de 1 coluna (`grid-cols-1 gap-4`). |
| **Modal de Detalhes** | Modal centralizado com largura máxima (`max-w-2xl`) e backdrop escuro. | Drawer/Bottom-Sheet ocupando `95%` da altura da tela para facilitar uso com uma mão. |

---

## 4. Controle de Acesso e Roteamento (RBAC)

O roteamento deve proteger as telas com base no `role` decodificado do token JWT (`DONOR`, `NGO`, `ADMIN`):

```text
/login                       -> Pública (Redireciona se logado)
/register                    -> Pública (Abas: "Quero Doar" | "Sou uma ONG")
│
├── [Rota Protegida: NGO Status === 'PENDENTE APROVACAO']
│   └── /pending-approval    -> Tela de aviso aguardando curadoria do Admin
│
├── [Rota Protegida: DONOR & NGO (ATIVO)]
│   ├── /feed                -> Vitrine regional (ONG dá "like"; Doador visualiza vitrine)
│   ├── /donations           -> Doador: Meus itens + Lista de ONGs interessadas
│   │                           ONG: Itens que demonstrei interesse
│   ├── /donations/new       -> Exclusivo DONOR: Formulário com trava de 3 fotos
│   ├── /chats               -> Lista de negociações ativas (EM_PROGRESSO)
│   ├── /chats/:itemId       -> Sala de chat + Botão "Confirmar Recebimento" (só NGO)
│   └── /profile             -> Dados cadastrais e localização (Cidade/Estado)
│
└── [Rota Protegida: ADMIN]
    └── /admin/ngos          -> Tabela de validação de CNPJ/Documentos (Aprovar/Rejeitar)
```

---

## 5. Regras Críticas de Implementação no Client-Side

### 5.1. Trava e Compressão das 3 Fotos (`UC-02` & `RNF-03`)
* O componente de upload de imagens (`PhotoUploader.tsx`) deve bloquear o botão de submissão enquanto `photos.length !== 3`.
* **Otimização Client-Side:** Antes de enviar ao backend/storage, utilizar uma biblioteca leve (ex: `browser-image-compression`) para converter e comprimir cada imagem para `.webp` garantindo tamanho inferior a **5MB** (`RNF-03`) e carregamento rápido em redes 3G (`RNF-01`).

### 5.2. Carrossel nos Cards do Feed
* Cada card do feed (`DonationCard.tsx`) renderiza um mini-carrossel contendo as 3 fotos do item com indicadores visuais (bullets) na base da imagem, permitindo que a ONG inspecione o item sem precisar abrir o modal.

### 5.3. Atualização do Chat (`RF-08`)
* Para cumprir o prazo de 2 dias sem complexidade de infraestrutura WebSocket, o hook `useChatMessages(itemId)` utilizará **Short Polling** via TanStack Query (`refetchInterval: 3000` enquanto a tela de chat estiver aberta), garantindo sensação de tempo real com código mínimo.

---

## 6. Guia de Execução Rápida (Vibe Coding Roadmap)

1. **Setup Inicial (Hora 0 - 1):** Criar projeto Vite + React + TS + Tailwind. Configurar pasta `src/core/types` com as interfaces do banco de dados.
2. **Layout Shell & Mock Data (Hora 1 - 3):** Construir `Sidebar`, `Header`, `CategoryBar` e `DonationCard` idênticos aos mockups de UI usando dados mockados locais.
3. **Fluxo de Autenticação & Admin (Hora 3 - 6):** Integrar login/cadastro (com seleção de Cidade/Estado) e tela simples de aprovação de ONG.
4. **Cadastro de Item + 3 Fotos (Hora 6 - 10):** Implementar formulário de nova doação com validação estrita de 3 imagens e upload.
5. **Match Invertido & Chat (Hora 10 - 16):** Conectar botão "Tenho Interesse", modal de escolha da ONG pelo Doador, tela de chat com polling e botões de "Confirmar Recebimento" / "Cancelar".
6. **Ajuste Fino Mobile & Deploy (Hora 16 - 20):** Testar viewports de `320px` a `1440px` e publicar na Vercel.