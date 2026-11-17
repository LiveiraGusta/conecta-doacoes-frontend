import { createContext, useContext } from 'react';

export type SnackbarVariant = 'info' | 'success' | 'error';

export interface SnackbarOptions {
  message: string;
  variant?: SnackbarVariant;
  /** Botão de ação (ex.: "Desfazer"). Clicar fecha o snackbar. */
  action?: { label: string; onClick(): void };
  /** Em ms; padrão 4000. */
  duration?: number;
}

export interface SnackbarApi {
  /** Põe na fila (um por vez, como o mat-snackbar) e devolve o id. */
  show(options: SnackbarOptions): number;
  dismiss(id?: number): void;
}

export const SnackbarContext = createContext<SnackbarApi | null>(null);

export function useSnackbar(): SnackbarApi {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar precisa estar dentro de <SnackbarProvider>');
  return ctx;
}
