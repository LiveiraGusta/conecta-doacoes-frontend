import { createContext, useContext } from 'react';

export interface LoginPromptApi {
  /**
   * Visitante tentou uma ação que exige login: abre "Entre para continuar".
   * `redirect` é para onde voltar depois do login (padrão: a página atual).
   */
  prompt(redirect?: string): void;
}

export const LoginPromptContext = createContext<LoginPromptApi | null>(null);

export function useLoginPrompt(): LoginPromptApi {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error('useLoginPrompt precisa estar dentro de <LoginPromptProvider>');
  return ctx;
}
