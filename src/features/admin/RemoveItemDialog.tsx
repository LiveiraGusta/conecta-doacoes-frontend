import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { Modal } from '@/components/ui/Modal';

const MIN = 10;
const MAX = 500;

/**
 * Remover o anúncio pela moderação (guia, F11b): motivo de 10 a 500 caracteres, que o doador vê em
 * "Minhas doações". Avisa quando a remoção vai encerrar uma negociação em andamento.
 */
export function RemoveItemDialog({
  open,
  title,
  inProgress,
  loading,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  /** O item está em negociação: a remoção cancela. */
  inProgress: boolean;
  loading: boolean;
  error: string | null;
  onConfirm(reason: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const length = reason.trim().length;
  const problem =
    length < MIN ? t('moderation.reasonTooShort') : length > MAX ? t('moderation.reasonTooLong') : undefined;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('moderation.removeTitle')}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('moderation.back')}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (!problem) onConfirm(reason.trim());
            }}
          >
            {t('moderation.removeConfirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography color="text.secondary">{t('moderation.removeText', { title })}</Typography>
        {inProgress && (
          <Typography color="warning.main" sx={{ fontWeight: 600 }}>
            {t('moderation.removeInProgress')}
          </Typography>
        )}
        <FormAlert message={error} />
        <TextField
          label={t('moderation.reasonLabel')}
          hint={`${t('moderation.reasonHint')} · ${length}/${MAX}`}
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? problem : undefined}
          slotProps={{ htmlInput: { maxLength: MAX } }}
        />
      </div>
    </Modal>
  );
}
