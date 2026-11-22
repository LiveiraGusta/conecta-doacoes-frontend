import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PublishRounded from '@mui/icons-material/PublishRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useObjectUrls } from '@/core/hooks/useObjectUrl';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { SelectField } from '@/components/ui/form/SelectField';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { newItemSchema, type NewItemValues } from '@/core/schemas/item';
import { createItem } from '@/core/services/items';
import { applyApiError } from '@/core/utils/apiErrors';
import { CATEGORIES } from '@/features/feed/categories';
import { PhotoCarousel } from '@/features/feed/PhotoCarousel';
import { PhotoPicker } from './PhotoPicker';

const STEPS = ['photos', 'details', 'review'] as const;
type StepName = (typeof STEPS)[number];

/** Campos de cada etapa: "Próximo" só valida os da etapa atual. */
type FieldName = keyof NewItemValues;
const STEP_FIELDS: Record<Exclude<StepName, 'review'>, FieldName[]> = {
  photos: ['photos'],
  details: ['title', 'category', 'description', 'notes'],
};
const ALL_FIELDS: FieldName[] = [...STEP_FIELDS.photos, ...STEP_FIELDS.details];

const stepOf = (field: FieldName): number => (STEP_FIELDS.photos.includes(field) ? 0 : 1);

function ReviewRow({ label, onEdit, children }: { label: string; onEdit(): void; children: ReactNode }) {
  const { t } = useTranslation('donations');
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`${t('new.edit')}: ${label}`}>
          {t('new.edit')}
        </Button>
      </div>
      {children}
    </div>
  );
}

/**
 * Publicar doação (guia, F6) em 3 etapas (decisão da fase 4): fotos → dados → revisar.
 * Um formulário só (React Hook Form); cada etapa valida os seus campos. Sair com algo preenchido pede confirmação.
 */
export function NewItemForm() {
  const { t } = useTranslation(['donations', 'common']);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const photosErrorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const done = useRef(false);

  const form = useForm<NewItemValues>({
    resolver: zodResolver(newItemSchema),
    defaultValues: { photos: [], title: '', category: '' as NewItemValues['category'], description: '', notes: '' },
  });
  const { errors, isDirty } = form.formState;
  const values = useWatch({ control: form.control });
  const photoFiles = useMemo(() => (values.photos ?? []).map((p) => p!.file!), [values.photos]);
  const photoUrls = useObjectUrls(photoFiles);

  // Sair no meio (menu, voltar do navegador) com algo preenchido: "Descartar esta doação?".
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !done.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const goTo = (next: number) => {
    setStep(next);
    // Leitor de tela e teclado: o foco vai para o título da etapa nova.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const next = async () => {
    const name = STEPS[step] as Exclude<StepName, 'review'>;
    if (await form.trigger(STEP_FIELDS[name], { shouldFocus: true })) goTo(step + 1);
  };

  const mutation = useMutation({
    mutationFn: createItem,
    onSuccess: async () => {
      done.current = true;
      snackbar.show({ message: t('new.published', { city: user?.city ?? '' }), variant: 'success' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['myItems'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
      navigate('/donations');
    },
    onError: (err) => {
      setFormError(
        applyApiError(err, form.setError, {
          fields: ALL_FIELDS,
          codes: { INVALID_PHOTO_COUNT: 'photos', INVALID_PHOTO: 'photos', PAYLOAD_TOO_LARGE: 'photos' },
        }),
      );
      // Volta para a etapa do primeiro campo com erro.
      const first = ALL_FIELDS.find((f) => form.getFieldState(f).error);
      if (first) goTo(stepOf(first));
    },
  });

  const onValid = (v: NewItemValues) => {
    setFormError(null);
    mutation.mutate({
      title: v.title,
      category: v.category,
      description: v.description || undefined,
      notes: v.notes || undefined,
      photos: v.photos.map((p) => p.file),
    });
  };
  // Erro de validação na revisão (ex.: limite mudou): volta para a etapa do campo.
  const onInvalid = (errs: Partial<Record<FieldName, unknown>>) => {
    const first = ALL_FIELDS.find((f) => errs[f]);
    if (first) goTo(stepOf(first));
  };

  const stepTitle = [t('new.photosTitle'), t('new.detailsTitle'), t('new.reviewTitle')][step];
  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: t(`common:categories.${c}`) }));
  const description = values.description ?? '';
  const notes = values.notes ?? '';

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) void next();
        else void form.handleSubmit(onValid, onInvalid)(e);
      }}
      className="flex flex-col gap-6"
    >
      <Stepper activeStep={step} alternativeLabel nonLinear>
        {STEPS.map((name, i) => (
          <Step key={name} completed={i < step}>
            <StepButton onClick={() => i < step && goTo(i)} disabled={i > step}>
              {t(`new.steps.${name}`)}
            </StepButton>
          </Step>
        ))}
      </Stepper>

      <Paper variant="outlined" className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <Typography variant="caption" color="text.secondary">
            {t('new.stepOf', { n: step + 1, total: STEPS.length })}
          </Typography>
          <Typography ref={headingRef} tabIndex={-1} variant="h6" component="h2" className="outline-none">
            {stepTitle}
          </Typography>
        </div>
        <FormAlert message={formError} />

        {step === 0 && (
          <>
            <Typography variant="body2" color="text.secondary">
              {t('new.photosHint')}
            </Typography>
            <Controller
              control={form.control}
              name="photos"
              render={({ field }) => (
                <PhotoPicker
                  id={photosErrorId}
                  value={field.value}
                  onChange={(slots) => {
                    field.onChange(slots);
                    if (errors.photos) void form.trigger('photos');
                  }}
                  error={errors.photos?.message}
                />
              )}
            />
          </>
        )}

        {step === 1 && (
          <>
            <TextField
              label={t('fields.title')}
              placeholder={t('fields.titlePlaceholder')}
              slotProps={{ htmlInput: { maxLength: 255 } }}
              error={errors.title?.message}
              {...form.register('title')}
            />
            <SelectField
              label={t('fields.category')}
              placeholder={t('fields.categoryPlaceholder')}
              options={categoryOptions}
              error={errors.category?.message}
              {...form.register('category')}
            />
            <TextField
              label={t('fields.description')}
              multiline
              minRows={3}
              hint={`${t('fields.descriptionHint')} · ${t('fields.counter', { count: description.length, max: 2000 })}`}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              error={errors.description?.message}
              {...form.register('description')}
            />
            <TextField
              label={t('fields.notes')}
              multiline
              minRows={2}
              hint={`${t('fields.notesHint')} · ${t('fields.counter', { count: notes.length, max: 1000 })}`}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              error={errors.notes?.message}
              {...form.register('notes')}
            />
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <Typography variant="body2" color="text.secondary">
              {t('new.reviewHint')}
            </Typography>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ReviewRow label={t('new.steps.photos')} onEdit={() => goTo(0)}>
                <PhotoCarousel photos={photoUrls} title={values.title ?? ''} className="aspect-[4/3] rounded-xl" />
              </ReviewRow>
              <div className="flex flex-col gap-4">
                <ReviewRow label={t('new.steps.details')} onEdit={() => goTo(1)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="h6" component="p" className="break-words">
                      {values.title}
                    </Typography>
                    {values.category && <Badge tone="accent">{t(`common:categories.${values.category}`)}</Badge>}
                  </div>
                  <Typography color={description ? 'text.primary' : 'text.secondary'} className="whitespace-pre-line">
                    {description || t('new.noDescription')}
                  </Typography>
                </ReviewRow>
                {notes && (
                  <>
                    <Divider />
                    <div>
                      <Typography variant="overline" color="text.secondary">
                        {t('fields.notes')}
                      </Typography>
                      <Typography className="whitespace-pre-line">{notes}</Typography>
                    </div>
                  </>
                )}
                {user && (
                  <Typography color="text.secondary" className="flex items-center gap-1">
                    <LocationOnOutlined fontSize="small" aria-hidden />
                    {t('new.willPublishIn', { city: user.city, state: user.state })}
                  </Typography>
                )}
              </div>
            </div>
          </div>
        )}
      </Paper>

      <div
        className={
          isMobile
            ? 'sticky bottom-[72px] z-10 -mx-4 flex gap-3 border-t border-border bg-surface px-4 py-3'
            : 'flex justify-end gap-3'
        }
      >
        {step > 0 && (
          <Button
            variant="secondary"
            icon={<ArrowBackRounded />}
            onClick={() => goTo(step - 1)}
            disabled={mutation.isPending}
          >
            {t('new.back')}
          </Button>
        )}
        <div className="flex-1 md:hidden" />
        {step < STEPS.length - 1 ? (
          <Button type="submit" endIcon={<ArrowForwardRounded />}>
            {t('new.next')}
          </Button>
        ) : (
          <Button type="submit" icon={<PublishRounded />} loading={mutation.isPending}>
            {t('new.publish')}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={t('new.leaveTitle')}
        confirmLabel={t('new.leaveConfirm')}
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        {t('new.leaveDescription')}
      </ConfirmDialog>
    </form>
  );
}
