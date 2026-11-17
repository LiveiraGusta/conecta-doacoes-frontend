import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/form/FileDropzone';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { LocationFields } from '@/components/ui/form/LocationFields';
import { PasswordField } from '@/components/ui/form/PasswordField';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useCities } from '@/core/hooks/useCities';
import {
  accountSchema,
  documentSchema,
  passwordChangeSchema,
  type AccountValues,
  type DocumentValues,
  type PasswordChangeValues,
} from '@/core/schemas/profile';
import { changePassword, deleteAccount, resubmitDocument, updateProfile } from '@/core/services/profile';
import type { NgoStatus, User } from '@/core/types/api';
import { applyApiError } from '@/core/utils/apiErrors';
import { DOCUMENT_TYPES } from '@/core/utils/files';
import { SectionCard } from './SectionCard';
import { useSaveProfile } from './useSaveProfile';

/** Nome e cidade/UF (cidade do IBGE). Mudar a cidade muda o feed. */
export function AccountSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    values: { name: user.name, state: user.state, city: user.city },
  });
  const state = useWatch({ control: form.control, name: 'state' });
  const location = useCities(state);
  const save = useSaveProfile(updateProfile);

  return (
    <SectionCard id="dados" title={t('account.title')} description={t('account.description')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          const city = location.canonical(v.city);
          if (city === null) {
            return form.setError('city', { message: 'validation:cityNotInList' }, { shouldFocus: true });
          }
          save.mutate(
            { name: v.name.trim(), state: v.state, city: city ?? v.city },
            { onError: (e) => setFormError(applyApiError(e, form.setError, { fields: ['name', 'state', 'city'] })) },
          );
        })}
      >
        <FormAlert message={formError} />
        <TextField
          label={user.role === 'NGO' ? t('account.ngoName') : t('account.name')}
          autoComplete={user.role === 'NGO' ? 'organization' : 'name'}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <TextField label={t('account.email')} value={user.email} disabled hint={t('account.emailHint')} />
        <LocationFields
          control={form.control}
          setValue={form.setValue}
          errors={form.formState.errors}
          location={{ ...location, state }}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!form.formState.isDirty} loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

const STATUS_COLOR: Record<NgoStatus, 'success' | 'warning' | 'error'> = {
  ATIVO: 'success',
  PENDENTE_APROVACAO: 'warning',
  REJEITADO: 'error',
};

/** Situação da ONG; rejeitada pode reenviar o documento (guia, F4). */
export function NgoStatusSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const ngo = user.ngo_profile!;
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DocumentValues>({ resolver: zodResolver(documentSchema), defaultValues: { document: null } });
  const save = useSaveProfile(resubmitDocument, t('ngoStatus.resubmitted'));

  return (
    <SectionCard id="situacao" title={t('ngoStatus.title')}>
      <div className="flex flex-col items-start gap-2">
        <Chip label={t(`ngoStatus.${ngo.status}`)} color={STATUS_COLOR[ngo.status]} />
        {ngo.status === 'ATIVO' && <p className="text-fg-muted">{t('ngoStatus.activeText')}</p>}
        {ngo.status === 'PENDENTE_APROVACAO' && <p className="text-fg-muted">{t('ngoStatus.pendingText')}</p>}
        {ngo.status === 'REJEITADO' && (
          <Alert severity="error" className="w-full">
            {t('ngoStatus.rejectedText', { reason: ngo.rejection_reason ?? '—' })}
          </Alert>
        )}
      </div>
      {ngo.status === 'REJEITADO' && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => {
            setFormError(null);
            save.mutate(v.document!, {
              onError: (e) =>
                setFormError(
                  applyApiError(e, form.setError, { fields: ['document'], codes: { INVALID_DOCUMENT: 'document' } }),
                ),
            });
          })}
        >
          <FormAlert message={formError} />
          <Controller
            control={form.control}
            name="document"
            render={({ field }) => (
              <FileDropzone
                label={t('ngoStatus.document')}
                name={field.name}
                accept={DOCUMENT_TYPES}
                value={field.value ?? null}
                onChange={(file) => {
                  field.onChange(file);
                  void form.trigger('document');
                }}
                error={form.formState.errors.document?.message}
              />
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending}>
              {t('ngoStatus.resubmit')}
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

/** Trocar senha: a API encerra as outras sessões e renova o cookie desta (continua logado). */
export function PasswordSection() {
  const { t } = useTranslation('profile');
  const snackbar = useSnackbar();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { current: '', password: '', confirm: '' },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const mutation = useMutation({
    mutationFn: (v: PasswordChangeValues) => changePassword(v.current, v.password),
    onSuccess: () => {
      form.reset();
      snackbar.show({ message: t('password.changed'), variant: 'success' });
    },
    onError: (e) =>
      setFormError(
        applyApiError(e, form.setError, {
          fields: ['current', 'password'],
          codes: { INVALID_CURRENT_PASSWORD: 'current', SAME_PASSWORD: 'password' },
          aliases: { new_password: 'password', current_password: 'current' },
        }),
      ),
  });
  const { errors } = form.formState;

  return (
    <SectionCard id="senha" title={t('password.title')} description={t('password.description')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          mutation.mutate(v);
        })}
      >
        <FormAlert message={formError} />
        <PasswordField
          label={t('password.current')}
          autoComplete="current-password"
          error={errors.current?.message}
          {...form.register('current')}
        />
        <div className="flex flex-col gap-4">
          <PasswordField
            label={t('password.new')}
            autoComplete="new-password"
            showRules
            rulesValue={password}
            error={errors.password?.message}
            {...form.register('password')}
          />
          <PasswordField
            label={t('password.confirm')}
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...form.register('confirm')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending}>
            {t('password.submit')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/** Excluir conta (guia, F12): senha e consequências; negociação em andamento bloqueia, com atalho às conversas. */
export function DeleteAccountSection() {
  const { t } = useTranslation(['profile', 'common']);
  const { logout } = useAuth();
  const snackbar = useSnackbar();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const mutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: async () => {
      setOpen(false);
      await logout();
      snackbar.show({ message: t('delete.done'), variant: 'info' });
    },
    onError: (e) => setError(e instanceof ApiError ? e : null),
  });
  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setPassword('');
    setError(null);
  };

  return (
    <SectionCard
      id="excluir"
      danger
      title={t('delete.title')}
      description={t('delete.description')}
      footer={
        <Button variant="danger" onClick={() => setOpen(true)}>
          {t('delete.button')}
        </Button>
      }
    >
      <Modal
        open={open}
        onClose={close}
        title={t('delete.dialogTitle')}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={mutation.isPending}
              disabled={!password}
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
            >
              {t('delete.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert severity="warning">{t('delete.consequences')}</Alert>
          {error && (
            <Alert
              severity="error"
              role="alert"
              action={
                error.code === 'HAS_ACTIVE_NEGOTIATIONS' ? (
                  <Button to="/chats" size="sm" variant="ghost">
                    {t('delete.activeNegotiations')}
                  </Button>
                ) : undefined
              }
            >
              {error.message}
            </Alert>
          )}
          <PasswordField
            label={t('delete.password')}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Modal>
    </SectionCard>
  );
}
