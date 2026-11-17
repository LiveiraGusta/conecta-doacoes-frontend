import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Combobox } from './Combobox';
import { SelectField } from './SelectField';
import { UF_LIST } from '@/core/schemas/common';
import type { useCities } from '@/core/hooks/useCities';

interface LocationShape extends FieldValues {
  state: string;
  city: string;
}

/**
 * UF + cidade com sugestões do IBGE (decisão da fase 2): o feed compara a cidade exata, então
 * "Sao paulo" e "São Paulo" virariam cidades diferentes. Ao sair do campo, a grafia vira a oficial.
 * Sem IBGE (rede ou fora do ar), a cidade é digitada livre.
 */
export function LocationFields<T extends LocationShape>({
  control,
  setValue,
  errors,
  location,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  errors: { state?: { message?: string }; city?: { message?: string } };
  location: ReturnType<typeof useCities> & { state: string };
}) {
  const { t } = useTranslation('auth');
  const cityPath = 'city' as Path<T>;

  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3">
      <Controller
        control={control}
        name={'state' as Path<T>}
        render={({ field }) => (
          <SelectField
            label={t('fields.state')}
            placeholder={t('fields.statePlaceholder')}
            options={UF_LIST.map((uf) => ({ value: uf, label: uf }))}
            error={errors.state?.message}
            autoComplete="address-level1"
            {...field}
            onChange={(e) => {
              field.onChange(e);
              setValue(cityPath, '' as PathValue<T, Path<T>>); // trocou a UF: a cidade antiga não vale
            }}
          />
        )}
      />
      <Controller
        control={control}
        name={cityPath}
        render={({ field }) => (
          <Combobox
            label={t('fields.city')}
            name={field.name}
            value={field.value as string}
            onChange={field.onChange}
            onBlur={() => {
              const official = location.canonical(field.value as string);
              if (official && official !== field.value) setValue(cityPath, official as PathValue<T, Path<T>>);
              field.onBlur();
            }}
            options={location.cities}
            freeSolo={location.isError}
            disabled={!location.state}
            placeholder={location.state ? t('fields.cityPlaceholder') : t('fields.cityFirstState')}
            emptyText={location.isError ? t('fields.cityUnavailable') : t('fields.cityNotFound')}
            hint={location.isError ? t('fields.cityUnavailable') : undefined}
            error={errors.city?.message}
          />
        )}
      />
    </div>
  );
}
