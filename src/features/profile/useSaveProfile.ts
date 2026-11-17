import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import type { User } from '@/core/types/api';

/**
 * Salva uma parte do perfil: grava o usuário novo na sessão, recarrega a página pessoal e o feed
 * (a cidade pode ter mudado) e avisa. Cada seção trata o próprio erro.
 */
export function useSaveProfile<V>(save: (vars: V) => Promise<User>, message?: string) {
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const { t } = useTranslation('profile');
  return useMutation({
    mutationFn: save,
    onSuccess: (user) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ['userPage'] });
      void queryClient.invalidateQueries({ queryKey: ['feed', 'auth'] });
      snackbar.show({ message: message ?? t('common.saved'), variant: 'success' });
    },
  });
}
