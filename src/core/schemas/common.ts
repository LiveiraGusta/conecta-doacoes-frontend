import { z } from 'zod';
import type { UF } from '../types/api';

/**
 * Schemas Zod reaproveitados pelos formulários. As mensagens são **chaves** do namespace `validation`
 * (src/i18n/pt-BR/validation.json); o <FieldError> traduz. Erros que vêm da API já chegam em português.
 */

export const UF_LIST = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const satisfies readonly UF[];

export const emailSchema = z.string().trim().min(1, 'validation:required').pipe(z.email('validation:email'));

/** Mesma regra da API: 8 a 72 caracteres, ao menos 1 letra e 1 número. */
export const passwordSchema = z
  .string()
  .min(8, 'validation:password.min')
  .max(72, 'validation:password.max')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'validation:password.letterAndNumber');

export const ufSchema = z.enum(UF_LIST, { error: 'validation:uf' });

export const citySchema = z.string().trim().min(2, 'validation:city').max(100, 'validation:city');

/** Regras da senha (as mesmas da API), para o checklist ao vivo do PasswordField. */
export const PASSWORD_RULES = [
  { key: 'length', test: (v: string) => v.length >= 8 && v.length <= 72 },
  { key: 'letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { key: 'number', test: (v: string) => /\d/.test(v) },
] as const;
