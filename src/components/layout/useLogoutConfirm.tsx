import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/useAuth';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/** "Deseja sair?" (lista de modais do plano). Devolve a função que abre e o diálogo para renderizar. */
export function useLogoutConfirm() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dialog = (
    <ConfirmDialog
      open={open}
      title={t('account.logoutTitle')}
      confirmLabel={t('account.logout')}
      loading={leaving}
      onCancel={() => setOpen(false)}
      onConfirm={async () => {
        setLeaving(true);
        await logout();
        setLeaving(false);
        setOpen(false);
      }}
    >
      {t('account.logoutDescription')}
    </ConfirmDialog>
  );

  return { ask: () => setOpen(true), dialog };
}
