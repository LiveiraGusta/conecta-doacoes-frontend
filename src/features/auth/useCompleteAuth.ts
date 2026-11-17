import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { homeFor, useAuth } from '@/core/auth/useAuth';
import { ME_KEY } from '@/core/services/auth';
import type { User } from '@/core/types/api';
import { safeRedirect } from '@/core/utils/redirect';

/**
 * Depois de login ou cadastro (a API já gravou o cookie): descarta o cache de visitante,
 * guarda o usuário e segue para o `?redirect=` (interno) ou o início do perfil.
 */
export function useCompleteAuth() {
  const queryClient = useQueryClient();
  const { setUser, clearAfterLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return useCallback(
    (user: User, to?: string) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
      const target = to ?? safeRedirect(params.get('redirect')) ?? homeFor(user.role);
      // O destino vai junto com o usuário: o PublicOnly da tela de login/cadastro redireciona para o mesmo lugar.
      setUser(user, target);
      // Chegou lá: o destino não vale mais (um /login aberto depois vai para o início normal).
      void Promise.resolve(navigate(target, { replace: true })).then(clearAfterLogin);
    },
    [queryClient, setUser, clearAfterLogin, navigate, params],
  );
}
