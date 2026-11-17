import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /** Ações definitivas (cancelar negociação, excluir conta): botão vermelho. */
  danger?: boolean;
  loading?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** "Tem certeza?" (guia, F10 e F12): confirmação antes de ações definitivas. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </>
      }
    >
      <div className="text-fg-muted">{children}</div>
    </Modal>
  );
}
