import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { PasswordField } from '@/components/ui/form/PasswordField';
import { Illustration } from '@/components/ui/Illustration';
import { ApiError } from '@/core/api/http';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from '@/core/schemas/auth';
import { forgotPassword, resetPassword } from '@/core/services/auth';
import { applyApiError } from '@/core/utils/apiErrors';

const linkClass = 'font-semibold text-primary-text hover:underline';

/** "Esqueci a senha" (guia, F3): a resposta é sempre a mesma, exista ou não a conta. */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: ForgotPasswordValues) => forgotPassword(v.email),
    onSuccess: () => setSent(true),
    onError: (err) => setFormError(applyApiError(err, form.setError, { fields: ['email'] })),
  });

  return (
    <AuthSplitLayout
      formSide="right"
      illustration="mailSent"
      title={sent ? t('forgot.sentTitle') : t('forgot.title')}
      subtitle={sent ? undefined : t('forgot.description')}
      footer={
        <Link to="/login" className={linkClass}>
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div role="status" className="flex flex-col items-center gap-4 text-center">
          <Illustration name="mailSent" className="max-w-56" />
          <p className="text-fg-muted">{t('forgot.sent')}</p>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => {
            setFormError(null);
            mutation.mutate(v);
          })}
        >
          <FormAlert message={formError} />
          <TextField
            label={t('fields.email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
            {t('forgot.submit')}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}

/**
 * Link do e-mail: /redefinir-senha?token=… (guia, F3). Sem token, ou com token inválido/expirado/usado,
 * mostra "Pedir um novo link". Sucesso: todas as sessões caem e o usuário entra com a senha nova.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const token = params.get('token');
  const [invalid, setInvalid] = useState(!token);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const password = useWatch({ control: form.control, name: 'password' });

  const mutation = useMutation({
    mutationFn: (v: ResetPasswordValues) => resetPassword(token!, v.password),
    onSuccess: () => {
      snackbar.show({ message: t('login.passwordChanged'), variant: 'success' });
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'INVALID_RESET_TOKEN') return setInvalid(true);
      setFormError(
        applyApiError(err, form.setError, { fields: ['password', 'confirm'], aliases: { new_password: 'password' } }),
      );
    },
  });

  if (invalid) {
    return (
      <AuthSplitLayout
        formSide="right"
        illustration="error"
        title={t('reset.invalidTitle')}
        subtitle={t('reset.invalidDescription')}
      >
        <Link
          to="/forgot-password"
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {t('reset.requestNew')}
        </Link>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout formSide="right" illustration="login" title={t('reset.title')} subtitle={t('reset.description')}>
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
          label={t('fields.newPassword')}
          autoComplete="new-password"
          showRules
          rulesValue={password}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <PasswordField
          label={t('fields.confirmPassword')}
          autoComplete="new-password"
          error={form.formState.errors.confirm?.message}
          {...form.register('confirm')}
        />
        <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
