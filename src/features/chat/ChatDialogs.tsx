import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { Modal } from '@/components/ui/Modal';

/**
 * Cancelar negociação (guia, F10): motivo opcional e o aviso "denuncie antes", porque depois do
 * cancelamento a conversa fecha e a denúncia é recusada (CHAT_CLOSED).
 */
export function CancelDialog({
  open,
  loading,
  error,
  onConfirm,
  onClose,
  onReportFirst,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onConfirm(reason: string): void;
  onClose(): void;
  onReportFirst(): void;
}) {
  const { t } = useTranslation('chat');
  const [reason, setReason] = useState('');
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('cancel.title')}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel.keep')}
          </Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(reason.trim())}>
            {t('cancel.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography color="text.secondary">{t('cancel.text')}</Typography>
        <Alert severity="warning">
          {t('cancel.warning')}{' '}
          <Link
            component="button"
            type="button"
            onClick={onReportFirst}
            sx={{ fontWeight: 700, verticalAlign: 'baseline' }}
          >
            {t('cancel.reportFirst')}
          </Link>
        </Alert>
        <FormAlert message={error} />
        <TextField
          label={t('cancel.reason')}
          hint={t('cancel.reasonHint')}
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </div>
    </Modal>
  );
}

/** Denunciar a outra parte (guia, F11): motivo de 10 a 1000 caracteres. */
export function ReportDialog({
  open,
  name,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  name: string;
  loading: boolean;
  error: string | null;
  onSubmit(reason: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation('chat');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const length = reason.trim().length;
  const problem = length < 10 ? t('report.tooShort') : length > 1000 ? t('report.tooLong') : undefined;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('report.title', { name })}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel.keep')}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (!problem) onSubmit(reason.trim());
            }}
          >
            {t('report.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography color="text.secondary">{t('report.text')}</Typography>
        <FormAlert message={error} />
        <TextField
          label={t('report.reason')}
          hint={`${t('report.reasonHint')} · ${length}/1000`}
          multiline
          minRows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? problem : undefined}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </div>
    </Modal>
  );
}
