import Link from '@mui/material/Link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { PasswordField } from '@/components/ui/form/PasswordField';
import { loginSchema, type LoginValues } from '@/core/schemas/auth';
import { login } from '@/core/services/auth';
import { applyApiError } from '@/core/utils/apiErrors';
import { useCompleteAuth } from './useCompleteAuth';

/**
 * Login (guia, F2). Credenciais erradas: sempre a mensagem genérica da API (não diz se foi o e-mail ou a senha).
 * `?email=` pré-preenche (vem do "e-mail já cadastrado" do cadastro).
 */
export function LoginForm() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const complete = useCompleteAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.get('email') ?? '', password: '' },
  });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => complete(user),
    onError: (err) => setFormError(applyApiError(err, form.setError, { fields: ['email', 'password'] })),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null);
        mutation.mutate(values);
      })}
    >
      <FormAlert message={formError} />
      <TextField
        label={t('fields.email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <PasswordField
        label={t('fields.password')}
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <Link
        component={RouterLink}
        to="/forgot-password"
        sx={{ fontWeight: 600 }}
        variant="body2"
        className="-mt-1 self-end"
      >
        {t('login.forgot')}
      </Link>
      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {t('login.submit')}
      </Button>
    </form>
  );
}
