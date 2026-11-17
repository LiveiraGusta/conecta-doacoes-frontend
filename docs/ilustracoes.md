# Ilustrações (unDraw)

As telas usam ilustrações do [unDraw](https://undraw.co/illustrations), de uso livre e sem atribuição obrigatória. Hoje todas mostram um **placeholder** (`src/assets/illustrations/placeholder.svg`).

## Como trocar

1. No unDraw, procure o nome sugerido. A cor de destaque pode ficar a padrão (`#6c63ff`).
2. Baixe em **SVG** e salve como `src/assets/illustrations/<arquivo>.svg`, com o nome da tabela.
3. Me avise (ou faça você):
   - no SVG, troque `#6c63ff` por `currentColor`, para a ilustração seguir a cor do tema e o modo escuro;
   - em `src/components/ui/Illustration.tsx`, troque o `Placeholder` da linha correspondente pelo import do arquivo (`import Login from '@/assets/illustrations/login.svg?react'`).

## Lista

| Nome no código | Arquivo | Onde aparece | Sugestão no unDraw |
| --- | --- | --- | --- |
| `login` | `login.svg` | Login (3/4 da tela) | "Gifts" ou "Charity" |
| `register` | `register.svg` | Cadastro (3/4 da tela) | "Join" ou "Community" |
| `empty` | `empty.svg` | Feed vazio, listas sem itens | "Empty" ou "No data" |
| `notFound` | `not-found.svg` | Página não encontrada (404) | "Page not found" |
| `forbidden` | `forbidden.svg` | Sem permissão (403) | "Access denied" ou "Security" |
| `error` | `error.svg` | Erro inesperado | "Server down" ou "Bug fixing" |
| `offline` | `offline.svg` | Sem conexão (se virar tela) | "Signal searching" |
| `waiting` | `waiting.svg` | ONG em análise | "Waiting" ou "Pending approval" |
| `messages` | `messages.svg` | Sem conversas | "Messages" ou "Chatting" |
| `mailSent` | `mail-sent.svg` | "Enviamos o link" (esqueci a senha) | "Mail sent" |
| `celebration` | `celebration.svg` | Doação concluída | "Celebration" ou "Gift" |
