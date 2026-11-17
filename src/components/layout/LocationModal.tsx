import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/form/Field';
import { LocationFields } from '../ui/form/LocationFields';
import { Modal } from '../ui/Modal';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useCities } from '@/core/hooks/useCities';
import { citySchema, ufSchema } from '@/core/schemas/common';
import { updateProfile } from '@/core/services/profile';
import { applyApiError } from '@/core/utils/apiErrors';

const schema = z.object({ state: ufSchema, city: citySchema });
type Values = z.infer<typeof schema>;

/**
 * Trocar a cidade pelo header (decisão do plano): PATCH /profile com cidade + UF e o feed recarrega,
 * porque o feed logado é sempre o da cidade do perfil (guia, F7).
 */
export function LocationModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useTranslation('feed');
  const { user, setUser } = useAuth();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { state: (user?.state ?? '') as Values['state'], city: user?.city ?? '' },
  });
  const state = useWatch({ control: form.control, name: 'state' });
  const location = useCities(open ? state : undefined);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (updated) => {
      setUser(updated);
      await queryClient.invalidateQueries({ queryKey: ['feed', 'auth'] });
      snackbar.show({ message: t('location.saved', { city: updated.city }), variant: 'success' });
      onClose();
    },
    onError: (err) => setFormError(applyApiError(err, form.setError, { fields: ['state', 'city'] })),
  });

  const close = () => {
    setFormError(null);
    form.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={t('location.title')} size="sm" closeOnBackdrop={!mutation.isPending}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          const city = location.canonical(values.city);
          if (city === null)
            return form.setError('city', { message: 'validation:cityNotInList' }, { shouldFocus: true });
          mutation.mutate({ state: values.state, city: city ?? values.city });
        })}
      >
        <p className="text-fg-muted">{t('location.description')}</p>
        <FormAlert message={formError} />
        <LocationFields
          control={form.control}
          setValue={form.setValue}
          errors={form.formState.errors}
          location={{ ...location, state }}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          {t('location.save')}
        </Button>
      </form>
    </Modal>
  );
}
