import { Outlet, ScrollRestoration } from 'react-router';
import { LoginPromptProvider } from '@/components/feedback/LoginPromptProvider';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { RealtimeProvider } from '@/core/realtime/RealtimeProvider';

/**
 * Providers que precisam do router (navegação no 401, "Entre para continuar").
 * Ordem: o AuthProvider usa o snackbar; o tempo real (chat) e o LoginPrompt usam a sessão.
 */
export function RootLayout() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <RealtimeProvider>
          <LoginPromptProvider>
            <Outlet />
            <ScrollRestoration />
          </LoginPromptProvider>
        </RealtimeProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}
