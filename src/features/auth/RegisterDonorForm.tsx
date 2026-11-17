import Link from '@mui/material/Link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { PasswordField } from '@/components/ui/form/PasswordField';
import { donorRegisterSchema, type DonorRegisterValues } from '@/core/schemas/auth';
import { registerDonor } from '@/core/services/auth';
import { applyApiError } from '@/core/utils/apiErrors';
import { LocationFields } from './LocationFields';
import { useCities } from './useCities';
import { useCompleteAuth } from './useCompleteAuth';

const FIELDS = ['name', 'email', 'password', 'state', 'city'] as const;

/** Cadastro de doador (guia, F2): já entra logado e vai para o feed da cidade. */
export function RegisterDonorForm() {
  const { t } = useTranslation('auth');
  const complete = useCompleteAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [takenEmail, setTakenEmail] = useState<string | null>(null);

  const form = useForm<DonorRegisterValues>({
    resolver: zodResolver(donorRegisterSchema),
    defaultValues: { name: '', email: '', password: '', state: '' as DonorRegisterValues['state'], city: '' },
  });
  const { errors } = form.formState;
  const [password, state] = useWatch({ control: form.control, name: ['password', 'state'] });
  const location = useCities(state);

  const mutation = useMutation({
    mutationFn: registerDonor,
    onSuccess: (user) => complete(user),
    onError: (err, values) => {
      setFormError(applyApiError(err, form.setError, { fields: FIELDS, codes: { EMAIL_TAKEN: 'email' } }));
      setTakenEmail(form.getFieldState('email').error?.type === 'server' ? values.email : null);
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null);
        setTakenEmail(null);
        const city = location.canonical(values.city);
        if (city === null) return form.setError('city', { message: 'validation:cityNotInList' }, { shouldFocus: true });
        mutation.mutate({ ...values, city: city ?? values.city });
      })}
    >
      <FormAlert message={formError} />
      <TextField label={t('fields.name')} autoComplete="name" error={errors.name?.message} {...form.register('name')} />
      <TextField
        label={t('fields.email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register('email')}
      />
      {takenEmail && (
        <Link component={RouterLink} to={`/login?email=${encodeURIComponent(takenEmail)}`} sx={{ fontWeight: 600 }}>
          {t('register.emailTakenLink')}
        </Link>
      )}
      <PasswordField
        label={t('fields.password')}
        autoComplete="new-password"
        showRules
        rulesValue={password}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <LocationFields
        control={form.control}
        setValue={form.setValue}
        errors={errors}
        location={{ ...location, state }}
      />
      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {t('register.submit')}
      </Button>
    </form>
  );
}
