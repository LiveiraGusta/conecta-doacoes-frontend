import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/core/api/http';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { setNgoStatus } from '@/core/services/admin';
import type { AdminNgo } from '@/core/types/api';
import { formatDate } from '@/core/utils/format';
import { NGO_STATUS_COLOR } from './adminStatus';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/** Rejeitar com motivo (10 a 1000): chips com motivos comuns preenchem o texto, que continua editável. */
function RejectDialog({
  ngo,
  open,
  loading,
  error,
  onConfirm,
  onClose,
}: {
  ngo: AdminNgo;
  open: boolean;
  loading: boolean;
  error: string | null;
  onConfirm(reason: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const presets = t('review.presetList', { returnObjects: true }) as string[];
  const labels = t('review.presetLabels', { returnObjects: true }) as string[];
  const short = reason.trim().length < 10;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('review.rejectTitle', { name: ngo.name })}
      size="md"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (!short) onConfirm(reason.trim());
            }}
          >
            {t('review.confirmReject')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography color="text.secondary">{t('review.rejectText')}</Typography>
        <FormAlert message={error} />
        <div role="group" aria-label={t('review.presets')} className="flex flex-wrap gap-2">
          {presets.map((text, i) => (
            <Chip
              key={text}
              label={labels[i] ?? text}
              variant={reason === text ? 'filled' : 'outlined'}
              color={reason === text ? 'primary' : 'default'}
              onClick={() => setReason(text)}
            />
          ))}
        </div>
        <TextField
          label={t('review.reason')}
          hint={`${t('review.reasonHint')} · ${reason.trim().length}/1000`}
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && short ? t('review.reasonShort') : undefined}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </div>
    </Modal>
  );
}

/**
 * Análise de uma ONG (guia, F5; decisões da fase 7): documento em prévia ao lado dos dados, "Aprovar"
 * com confirmação e "Rejeitar" com motivo. O link do documento expira em 10 minutos: "Recarregar" busca outro.
 */
export function NgoReviewModal({
  ngo,
  onClose,
  onReload,
  reloading,
}: {
  ngo: AdminNgo | null;
  onClose(): void;
  onReload(): void;
  reloading: boolean;
}) {
  const { t } = useTranslation(['admin', 'common']);
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (v: { status: 'ATIVO' | 'REJEITADO'; reason?: string }) =>
      setNgoStatus(ngo!.ngo_profile_id!, v.status, v.reason),
    onSuccess: (_r, v) => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      snackbar.show({
        message: t(v.status === 'ATIVO' ? 'review.approved' : 'review.rejected', { name: ngo!.name }),
        variant: 'success',
      });
      setDialog(null);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('common:system.errorTitle')),
  });

  if (!ngo) return null;
  const status = ngo.status!;
  const name = ngo.name!;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={t('review.title', { name })}
        size="xl"
        sheetOnMobile={false}
        footer={
          <>
            {status !== 'REJEITADO' && (
              <Button
                variant="secondary"
                icon={<CloseRounded />}
                onClick={() => {
                  setError(null);
                  setDialog('reject');
                }}
                sx={{ color: 'error.main', borderColor: 'error.main' }}
              >
                {t('review.reject')}
              </Button>
            )}
            {status !== 'ATIVO' && (
              <Button
                icon={<CheckRounded />}
                onClick={() => {
                  setError(null);
                  setDialog('approve');
                }}
              >
                {t('review.approve')}
              </Button>
            )}
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-2" aria-label={t('review.document')}>
            <iframe
              key={ngo.document_url}
              src={ngo.document_url}
              title={t('review.documentFrame', { name })}
              className="h-[60vh] w-full rounded-xl border border-border bg-white"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={ngo.document_url}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                className="flex items-center gap-1 px-2"
                sx={{ fontWeight: 600 }}
              >
                <OpenInNewRounded fontSize="small" aria-hidden />
                {t('review.openTab')}
              </Link>
              <Button variant="ghost" size="sm" icon={<RefreshRounded />} onClick={onReload} loading={reloading}>
                {t('review.reload')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {t('review.expiredHint')}
              </Typography>
            </div>
          </section>
          <section aria-label={t('review.data')} className="flex flex-col gap-4">
            <Chip label={t(`ngos.badge.${status}`)} color={NGO_STATUS_COLOR[status]} className="self-start" />
            <dl className="flex flex-col gap-3">
              <Field label={t('review.email')}>{ngo.email}</Field>
              <Field label={t('review.city')}>
                {ngo.city} - {ngo.state}
              </Field>
              <Field label={t('review.cnpj')}>
                <span className="font-mono">{ngo.cnpj}</span>
              </Field>
              <Field label={t('review.website')}>
                {ngo.website ? (
                  <Link href={ngo.website} target="_blank" rel="noopener noreferrer">
                    {ngo.website.replace(/^https?:\/\//, '')}
                  </Link>
                ) : (
                  <span className="text-fg-muted">{t('review.noWebsite')}</span>
                )}
              </Field>
              {ngo.created_at && <Field label={t('review.since')}>{formatDate(ngo.created_at)}</Field>}
            </dl>
            {ngo.rejection_reason && (
              <Alert severity="error">
                <strong>{t('review.rejectionReason')}:</strong> {ngo.rejection_reason}
              </Alert>
            )}
          </section>
        </div>
      </Modal>
      <ConfirmDialog
        open={dialog === 'approve'}
        title={t('review.approveTitle', { name })}
        confirmLabel={t('review.approve')}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ status: 'ATIVO' })}
        onCancel={() => setDialog(null)}
      >
        {error ?? t('review.approveText')}
      </ConfirmDialog>
      <RejectDialog
        key={`reject-${dialog === 'reject'}`}
        ngo={ngo}
        open={dialog === 'reject'}
        loading={mutation.isPending}
        error={error}
        onConfirm={(reason) => mutation.mutate({ status: 'REJEITADO', reason })}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
