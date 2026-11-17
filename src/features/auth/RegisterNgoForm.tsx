import Link from '@mui/material/Link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/form/FileDropzone';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import { PasswordField } from '@/components/ui/form/PasswordField';
import { ngoRegisterSchema, type NgoRegisterValues } from '@/core/schemas/auth';
import { registerNgo } from '@/core/services/auth';
import { applyApiError } from '@/core/utils/apiErrors';
import { maskCnpj } from '@/core/utils/cnpj';
import { DOCUMENT_TYPES } from '@/core/utils/files';
import { LocationFields } from './LocationFields';
import { useCities } from './useCities';
import { useCompleteAuth } from './useCompleteAuth';

const FIELDS = ['name', 'email', 'password', 'state', 'city', 'cnpj', 'website', 'document'] as const;

/** Página que a ONG vê logo depois do cadastro (nasce PENDENTE_APROVACAO). */
export const NGO_WELCOME_PATH = '/bem-vindo-ong';

/**
 * Cadastro de ONG (guia, F2): multipart com o documento. CNPJ com máscara e dígitos verificadores
 * conferidos no cliente; a API confere de novo e devolve o CNPJ mascarado.
 */
export function RegisterNgoForm() {
  const { t } = useTranslation('auth');
  const complete = useCompleteAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [takenEmail, setTakenEmail] = useState<string | null>(null);

  const form = useForm<NgoRegisterValues>({
    resolver: zodResolver(ngoRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      state: '' as NgoRegisterValues['state'],
      city: '',
      cnpj: '',
      website: '',
      document: null,
    },
  });
  const { errors } = form.formState;
  const [password, state] = useWatch({ control: form.control, name: ['password', 'state'] });
  const location = useCities(state);

  const mutation = useMutation({
    mutationFn: registerNgo,
    onSuccess: (user) => complete(user, NGO_WELCOME_PATH),
    onError: (err, values) => {
      setFormError(
        applyApiError(err, form.setError, {
          fields: FIELDS,
          codes: { EMAIL_TAKEN: 'email', CNPJ_TAKEN: 'cnpj', INVALID_DOCUMENT: 'document' },
        }),
      );
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
        mutation.mutate({
          ...values,
          city: city ?? values.city,
          website: values.website || undefined,
          document: values.document!,
        });
      })}
    >
      <FormAlert message={formError} />
      <TextField
        label={t('fields.ngoName')}
        autoComplete="organization"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <Controller
        control={form.control}
        name="cnpj"
        render={({ field }) => (
          <TextField
            label={t('fields.cnpj')}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            error={errors.cnpj?.message}
            {...field}
            onChange={(e) => field.onChange(maskCnpj(e.target.value))}
          />
        )}
      />
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
      <TextField
        label={t('fields.website')}
        type="url"
        inputMode="url"
        placeholder={t('fields.websitePlaceholder')}
        error={errors.website?.message}
        {...form.register('website')}
      />
      <Controller
        control={form.control}
        name="document"
        render={({ field }) => (
          <FileDropzone
            label={t('fields.document')}
            name={field.name}
            accept={DOCUMENT_TYPES}
            value={field.value ?? null}
            onChange={(file) => {
              field.onChange(file);
              void form.trigger('document');
            }}
            hint={t('fields.documentHint')}
            error={errors.document?.message}
          />
        )}
      />
      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {t('register.submitNgo')}
      </Button>
    </form>
  );
}
