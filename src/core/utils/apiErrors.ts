import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/http';

/** Código de erro da API → campo do formulário (ex.: EMAIL_TAKEN vai para "email"). */
export type CodeToField<T extends FieldValues> = Partial<Record<string, Path<T>>>;

/**
 * Leva o erro da API para o formulário (guia, §1.3):
 * - VALIDATION_ERROR: cada `details[].path` vira erro no campo de mesmo nome (o path da API é o nome do campo);
 * - códigos mapeados (EMAIL_TAKEN → email) vão para o campo;
 * - o resto volta como mensagem geral (a `message` da API já vem em português).
 * Devolve a mensagem geral, ou null se tudo foi parar em campos.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: {
    fields: readonly Path<T>[];
    codes?: CodeToField<T>;
    /** Campo da API com outro nome no formulário (ex.: new_password → password). */
    aliases?: Partial<Record<string, Path<T>>>;
  },
): string | null {
  if (!(error instanceof ApiError)) return 'Erro inesperado. Tente de novo.';

  if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
    const leftovers: string[] = [];
    let first = true;
    for (const d of error.details) {
      const apiPath = d.path ?? '';
      const path = options.aliases?.[apiPath] ?? apiPath;
      const message = d.message ?? error.message;
      const field = options.fields.find((f) => f === path || path.startsWith(`${f}.`));
      if (field) {
        setError(field, { type: 'server', message }, { shouldFocus: first });
        first = false;
      } else leftovers.push(message);
    }
    return leftovers.length ? leftovers.join(' ') : null;
  }

  const field = options.codes?.[error.code];
  if (field) {
    setError(field, { type: 'server', message: error.message }, { shouldFocus: true });
    return null;
  }
  return error.message;
}
