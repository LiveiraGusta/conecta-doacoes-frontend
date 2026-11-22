import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FormAlert, TextField } from '@/components/ui/form/Field';
import {
  addressSchema,
  bioSchema,
  contactSchema,
  digitsOnly,
  instagramUser,
  maskCep,
  maskPhone,
  type AddressValues,
  type BioValues,
  type ContactValues,
} from '@/core/schemas/profile';
import { updateProfile } from '@/core/services/profile';
import { lookupCep } from '@/core/services/viacep';
import type { Category, User } from '@/core/types/api';
import { applyApiError } from '@/core/utils/apiErrors';
import { normalizeText } from '@/core/services/ibge';
import { CATEGORY_OPTIONS } from '@/features/feed/categories';
import { SectionCard } from './SectionCard';
import { useSaveProfile } from './useSaveProfile';

/** Descrição da página pessoal (doador e ONG), até 500 caracteres. */
export function BioSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<BioValues>({ resolver: zodResolver(bioSchema), values: { bio: user.bio ?? '' } });
  const save = useSaveProfile(updateProfile);
  const bio = useWatch({ control: form.control, name: 'bio' });

  return (
    <SectionCard
      id="sobre"
      title={t('bio.title')}
      description={user.role === 'NGO' ? t('bio.descriptionNgo') : t('bio.descriptionDonor')}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          save.mutate(
            { bio: v.bio.trim() || null },
            { onError: (e) => setFormError(applyApiError(e, form.setError, { fields: ['bio'] })) },
          );
        })}
      >
        <FormAlert message={formError} />
        <TextField
          label={t('bio.label')}
          multiline
          minRows={3}
          hint={t('bio.counter', { count: bio.length })}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          error={form.formState.errors.bio?.message}
          {...form.register('bio')}
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

/** Contato da ONG: telefone com máscara, Instagram (usuário, @ ou link) e site. */
export function ContactSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const ngo = user.ngo_profile!;
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    values: {
      phone: ngo.phone ? maskPhone(ngo.phone) : '',
      instagram: ngo.instagram ?? '',
      website: ngo.website ?? '',
    },
  });
  const save = useSaveProfile(updateProfile);
  const { errors } = form.formState;

  return (
    <SectionCard id="contato" title={t('contact.title')} description={t('contact.description')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          save.mutate(
            {
              phone: digitsOnly(v.phone) || null,
              instagram: instagramUser(v.instagram) || null,
              website: v.website.trim() || null,
            },
            {
              onError: (e) =>
                setFormError(applyApiError(e, form.setError, { fields: ['phone', 'instagram', 'website'] })),
            },
          );
        })}
      >
        <FormAlert message={formError} />
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <TextField
                label={t('contact.phone')}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 98765-4321"
                error={errors.phone?.message}
                {...field}
                onChange={(e) => field.onChange(maskPhone(e.target.value))}
              />
            )}
          />
          <TextField
            label={t('contact.instagram')}
            hint={t('contact.instagramHint')}
            placeholder="@suaong"
            error={errors.instagram?.message}
            {...form.register('instagram')}
          />
        </div>
        <TextField
          label={t('contact.website')}
          type="url"
          inputMode="url"
          placeholder="https://"
          error={errors.website?.message}
          {...form.register('website')}
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

/** Categorias que a ONG aceita: chips que ligam e desligam. */
export function CategoriesSection({ user }: { user: User }) {
  const { t } = useTranslation(['profile', 'common']);
  const saved = user.ngo_profile!.accepted_categories;
  const [selected, setSelected] = useState<Category[]>(saved);
  const [base, setBase] = useState(saved);
  // Salvou (ou o usuário mudou por fora): a seleção acompanha.
  if (base !== saved) {
    setBase(saved);
    setSelected(saved);
  }
  const save = useSaveProfile(updateProfile);
  const changed = selected.length !== saved.length || selected.some((c) => !saved.includes(c));
  const toggle = (c: Category) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <SectionCard
      id="categorias"
      title={t('categories.title')}
      description={t('categories.description')}
      footer={
        <Button
          disabled={!changed}
          loading={save.isPending}
          onClick={() => save.mutate({ accepted_categories: selected })}
        >
          {t('common.save')}
        </Button>
      }
    >
      <div role="group" aria-label={t('categories.label')} className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.flatMap(({ value, icon: Icon }) => {
          if (!value) return [];
          const on = selected.includes(value);
          return [
            <Chip
              key={value}
              icon={<Icon />}
              label={t(`common:categories.${value}`)}
              color={on ? 'primary' : 'default'}
              variant={on ? 'filled' : 'outlined'}
              onClick={() => toggle(value)}
              aria-pressed={on}
            />,
          ];
        })}
      </div>
      <FormAlert message={save.error instanceof Error ? save.error.message : null} />
    </SectionCard>
  );
}

const emptyAddress: AddressValues = { cep: '', street: '', number: '', complement: '', neighborhood: '' };

/** Endereço da ONG: CEP com máscara preenche rua e bairro pelo ViaCEP; falhou, preenche à mão. */
export function AddressSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const address = user.ngo_profile!.address;
  const [formError, setFormError] = useState<string | null>(null);
  const [cepState, setCepState] = useState<'idle' | 'searching' | 'notFound'>('idle');
  const [otherCity, setOtherCity] = useState<{ city: string; state: string } | null>(null);
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    values: address ? { ...address, cep: maskCep(address.cep), complement: address.complement ?? '' } : emptyAddress,
  });
  const save = useSaveProfile(updateProfile);
  const remove = useSaveProfile(updateProfile, t('address.removed'));
  const { errors } = form.formState;

  const searchCep = async (cep: string) => {
    setCepState('searching');
    setOtherCity(null);
    const found = await lookupCep(cep);
    if (!found) return setCepState('notFound');
    setCepState('idle');
    if (found.street) form.setValue('street', found.street, { shouldDirty: true, shouldValidate: true });
    if (found.neighborhood) {
      form.setValue('neighborhood', found.neighborhood, { shouldDirty: true, shouldValidate: true });
    }
    if (normalizeText(found.city) !== normalizeText(user.city) || found.state !== user.state) {
      setOtherCity({ city: found.city, state: found.state });
    }
  };

  return (
    <SectionCard id="endereco" title={t('address.title')} description={t('address.description')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null);
          save.mutate(
            {
              address: {
                cep: digitsOnly(v.cep),
                street: v.street.trim(),
                number: v.number.trim(),
                complement: v.complement.trim() || undefined,
                neighborhood: v.neighborhood.trim(),
              },
            },
            {
              onError: (e) =>
                setFormError(
                  applyApiError(e, form.setError, {
                    fields: ['cep', 'street', 'number', 'complement', 'neighborhood'],
                    aliases: {
                      'address.cep': 'cep',
                      'address.street': 'street',
                      'address.number': 'number',
                      'address.complement': 'complement',
                      'address.neighborhood': 'neighborhood',
                    },
                  }),
                ),
            },
          );
        })}
      >
        <FormAlert message={formError} />
        <div className="grid gap-4 md:grid-cols-[minmax(0,180px)_1fr]">
          <Controller
            control={form.control}
            name="cep"
            render={({ field }) => (
              <TextField
                label={t('address.cep')}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                error={errors.cep?.message}
                hint={cepState === 'searching' ? t('address.searching') : undefined}
                {...field}
                onChange={(e) => {
                  const masked = maskCep(e.target.value);
                  field.onChange(masked);
                  if (digitsOnly(masked).length === 8) void searchCep(masked);
                  else setCepState('idle');
                }}
              />
            )}
          />
          <TextField
            label={t('address.street')}
            autoComplete="address-line1"
            error={errors.street?.message}
            {...form.register('street')}
          />
        </div>
        {cepState === 'notFound' && <Alert severity="info">{t('address.notFound')}</Alert>}
        {otherCity && <Alert severity="warning">{t('address.otherCity', otherCity)}</Alert>}
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label={t('address.number')} error={errors.number?.message} {...form.register('number')} />
          <TextField
            label={t('address.complement')}
            autoComplete="address-line2"
            error={errors.complement?.message}
            {...form.register('complement')}
          />
          <TextField
            label={t('address.neighborhood')}
            error={errors.neighborhood?.message}
            {...form.register('neighborhood')}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {address && (
            <Button variant="ghost" loading={remove.isPending} onClick={() => remove.mutate({ address: null })}>
              {t('address.remove')}
            </Button>
          )}
          <Button type="submit" disabled={!form.formState.isDirty} loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
