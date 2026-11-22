import { z } from 'zod';
import { isValidCnpj } from '../utils/cnpj';
import { DOCUMENT_TYPES, fileProblem } from '../utils/files';
import { citySchema, emailSchema, passwordSchema, ufSchema } from './common';

/** Mensagens são chaves de tradução (src/i18n/pt-BR/validation.json). */

export const loginSchema = z.object({
  email: emailSchema,
  // No login não se valida a regra da senha: a API responde o erro genérico de credenciais.
  password: z.string().min(1, 'validation:required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const nameSchema = z.string().trim().min(2, 'validation:name').max(255, 'validation:name');

export const donorRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  state: ufSchema,
  city: citySchema,
});
export type DonorRegisterValues = z.infer<typeof donorRegisterSchema>;

export const websiteSchema = z
  .string()
  .trim()
  .max(255, 'validation:website')
  .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'validation:website');

export const ngoRegisterSchema = donorRegisterSchema.extend({
  cnpj: z.string().refine(isValidCnpj, 'validation:cnpj'),
  website: websiteSchema,
  document: z
    .custom<File | null>((v) => v === null || v instanceof File)
    .superRefine((file, ctx) => {
      if (!file) return void ctx.addIssue({ code: 'custom', message: 'validation:documentRequired' });
      const problem = fileProblem(file, DOCUMENT_TYPES);
      if (problem === 'type') ctx.addIssue({ code: 'custom', message: 'validation:documentType' });
      if (problem === 'size') ctx.addIssue({ code: 'custom', message: 'validation:fileSize' });
    }),
});
export type NgoRegisterValues = z.infer<typeof ngoRegisterSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'validation:password.mismatch' });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
