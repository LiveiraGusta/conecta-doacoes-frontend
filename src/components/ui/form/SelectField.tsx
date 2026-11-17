import { TextField, type TextFieldProps } from './Field';

export interface SelectFieldProps extends Omit<TextFieldProps, 'select'> {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

/** Select (TextField do MUI com select nativo: no celular abre o seletor do sistema). */
export function SelectField({ options, placeholder, slotProps, ...rest }: SelectFieldProps) {
  return (
    <TextField select slotProps={{ ...slotProps, select: { native: true }, inputLabel: { shrink: true } }} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </TextField>
  );
}
