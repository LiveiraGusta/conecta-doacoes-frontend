import Autocomplete from '@mui/material/Autocomplete';
import type { ReactNode } from 'react';
import { filterByText } from '@/core/utils/text';
import { TextField } from './Field';

export interface ComboboxProps {
  label: string;
  value: string;
  onChange(value: string): void;
  onBlur?(): void;
  options: readonly string[];
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Mensagem quando nada combina com o texto. */
  emptyText: string;
  name?: string;
  /** Aceita texto livre sem a lista (ex.: lista indisponível). */
  freeSolo?: boolean;
  /** Máximo de sugestões visíveis. */
  limit?: number;
}

/**
 * Campo com sugestões (Autocomplete do MUI): filtra sem acento e sem caixa, ↑/↓ navegam, Enter escolhe
 * a destacada (a primeira, por padrão), Esc fecha. O valor do formulário é o texto do campo: escolher uma
 * opção só o preenche, e nada se perde ao sair do campo.
 */
export function Combobox({
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  hint,
  placeholder,
  disabled,
  emptyText,
  name,
  freeSolo = false,
  limit = 8,
}: ComboboxProps) {
  return (
    <Autocomplete
      options={options as string[]}
      value={null}
      inputValue={value}
      onInputChange={(_e, text, reason) => {
        if (reason !== 'reset') onChange(text);
      }}
      onChange={(_e, option) => {
        if (typeof option === 'string') onChange(option);
      }}
      filterOptions={(opts, state) => filterByText(opts, state.inputValue, limit)}
      freeSolo={freeSolo}
      clearOnBlur={false}
      autoHighlight
      handleHomeEndKeys
      disabled={disabled}
      noOptionsText={emptyText}
      onBlur={onBlur}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          placeholder={placeholder}
          error={error}
          hint={hint}
          slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }}
        />
      )}
    />
  );
}
