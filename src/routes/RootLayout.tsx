import { Outlet, ScrollRestoration } from 'react-router';
import { LoginPromptProvider } from '@/components/feedback/LoginPromptProvider';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';
import { AuthProvider } from '@/core/auth/AuthProvider';

/**
 * Providers que precisam do router (navegação no 401, "Entre para continuar").
 * Ordem: o AuthProvider usa o snackbar; o LoginPrompt usa a sessão.
 */
export function RootLayout() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <LoginPromptProvider>
          <Outlet />
          <ScrollRestoration />
        </LoginPromptProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}
