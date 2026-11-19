import FlagOutlined from '@mui/icons-material/FlagOutlined';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useLoginPrompt } from '@/core/feedback/useLoginPrompt';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import type { ItemView } from '@/core/hooks/useItem';
import { reportItem } from '@/core/services/items';
import type { ReportCategory } from '@/core/types/api';

/** Na ordem em que aparecem no diálogo (as mais graves primeiro). */
const REPORT_CATEGORIES: ReportCategory[] = ['NUDEZ', 'ODIO', 'VIOLENCIA', 'GOLPE', 'PROIBIDO', 'SPAM', 'OUTRO'];
const MAX_REASON = 1000;
const MIN_OTHER = 10;

/** Denunciar o conteúdo do anúncio (guia, F11b): categoria obrigatória; texto obrigatório só em "Outro". */
export function ReportItemDialog({
  open,
  title,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  onSubmit(category: ReportCategory, reason: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation('feed');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const length = reason.trim().length;
  const categoryProblem = category ? undefined : t('reportItem.chooseCategory');
  const reasonProblem =
    category === 'OUTRO' && length < MIN_OTHER
      ? t('reportItem.reasonRequired')
      : length > MAX_REASON
        ? t('reportItem.tooLong')
        : undefined;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('reportItem.title')}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('reportItem.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (category && !reasonProblem) onSubmit(category, reason.trim());
            }}
          >
            {t('reportItem.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography color="text.secondary">{t('reportItem.text', { title })}</Typography>
        <FormAlert message={error} />
        <fieldset className="flex flex-col gap-1">
          <Typography component="legend" sx={{ fontWeight: 700, mb: 1 }}>
            {t('reportItem.categoryLabel')}
          </Typography>
          <RadioGroup
            name="report-category"
            value={category ?? ''}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
          >
            {REPORT_CATEGORIES.map((c) => (
              <FormControlLabel
                key={c}
                value={c}
                control={<Radio size="small" />}
                label={
                  <span className="flex flex-col py-1">
                    <span>{t(`reportItem.categories.${c}.label`)}</span>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {t(`reportItem.categories.${c}.hint`)}
                    </Typography>
                  </span>
                }
              />
            ))}
          </RadioGroup>
          {touched && categoryProblem && (
            <Typography variant="body2" color="error" role="alert">
              {categoryProblem}
            </Typography>
          )}
        </fieldset>
        <TextField
          label={t(category === 'OUTRO' ? 'reportItem.reasonRequiredLabel' : 'reportItem.reasonLabel')}
          hint={`${t('reportItem.reasonHint')} · ${length}/${MAX_REASON}`}
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? reasonProblem : undefined}
          slotProps={{ htmlInput: { maxLength: MAX_REASON } }}
        />
      </div>
    </Modal>
  );
}

/** Quem pode denunciar: visitante (vai para o login), doador e ONG — menos o dono, o Admin e anúncio fora do ar. */
function canReportItem(
  item: Pick<ItemView, 'donor_id' | 'moderation_status'>,
  user: { id: string; role: string } | null,
) {
  if (item.moderation_status !== 'VISIVEL') return false;
  if (!user) return true;
  return user.role !== 'ADMIN' && user.id !== item.donor_id;
}

/** Link discreto "Denunciar anúncio" no rodapé do detalhe, com o diálogo. */
export function ReportItemLink({ item }: { item: ItemView }) {
  const { t } = useTranslation('feed');
  const { user } = useAuth();
  const loginPrompt = useLoginPrompt();
  const snackbar = useSnackbar();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const mutation = useMutation({
    mutationFn: ({ category, reason }: { category: ReportCategory; reason: string }) =>
      reportItem(item.id, category, reason || undefined),
    onSuccess: () => {
      setOpen(false);
      setSent(true);
      snackbar.show({ message: t('reportItem.done'), variant: 'success' });
    },
    onError: (e) => {
      // Já tinha denunciado: para quem denuncia, o resultado é o mesmo.
      if (e instanceof ApiError && e.code === 'ITEM_ALREADY_REPORTED') {
        setOpen(false);
        setSent(true);
        snackbar.show({ message: t('reportItem.already'), variant: 'info' });
      }
    },
  });

  if (!canReportItem(item, user)) return null;
  if (sent) {
    return (
      <Typography variant="body2" color="text.secondary" className="flex items-center gap-1 self-center">
        <FlagOutlined fontSize="small" aria-hidden />
        {t('reportItem.sent')}
      </Typography>
    );
  }

  const error =
    mutation.error && !(mutation.error instanceof ApiError && mutation.error.code === 'ITEM_ALREADY_REPORTED')
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : t('reportItem.error')
      : null;

  return (
    <>
      <Link
        component="button"
        type="button"
        variant="body2"
        color="text.secondary"
        underline="hover"
        className="flex items-center gap-1 self-center"
        onClick={() => (user ? (mutation.reset(), setOpen(true)) : loginPrompt.prompt(`/items/${item.id}`))}
      >
        <FlagOutlined fontSize="small" aria-hidden />
        {t('reportItem.link')}
      </Link>
      {open && (
        <ReportItemDialog
          open
          title={item.title}
          loading={mutation.isPending}
          error={error}
          onSubmit={(category, reason) => mutation.mutate({ category, reason })}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
