import { z } from 'zod';
import { DOCUMENT_TYPES, fileProblem } from '../utils/files';
import { nameSchema, websiteSchema } from './auth';
import { citySchema, passwordSchema, ufSchema } from './common';

/** Formulários do perfil (fase 6), com as regras do PATCH /profile da API. Mensagens são chaves de `validation`. */

export const digitsOnly = (v: string) => v.replace(/\D/g, '');

/** "11987654321" → "(11) 98765-4321"; aceita digitar com ou sem máscara. */
export function maskPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** "01310100" → "01310-100". */
export function maskCep(value: string): string {
  const d = digitsOnly(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "ong", "@ong" ou a URL do perfil → "ong" (a API guarda só o usuário). */
export function instagramUser(value: string): string {
  const v = value.trim();
  const fromUrl = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  return (fromUrl ?? v).replace(/^@/, '');
}

export const bioSchema = z.object({ bio: z.string().trim().max(500, 'validation:profile.bio') });
export type BioValues = z.infer<typeof bioSchema>;

export const contactSchema = z.object({
  phone: z.string().refine((v) => v.trim() === '' || /^[1-9]\d{9,10}$/.test(digitsOnly(v)), 'validation:profile.phone'),
  instagram: z
    .string()
    .refine((v) => v.trim() === '' || /^[A-Za-z0-9._]{1,30}$/.test(instagramUser(v)), 'validation:profile.instagram'),
  website: websiteSchema,
});
export type ContactValues = z.infer<typeof contactSchema>;

export const addressSchema = z.object({
  cep: z.string().refine((v) => digitsOnly(v).length === 8, 'validation:profile.cep'),
  street: z.string().trim().min(2, 'validation:profile.street').max(200, 'validation:profile.street'),
  number: z.string().trim().min(1, 'validation:required').max(20, 'validation:profile.number'),
  complement: z.string().trim().max(100, 'validation:profile.complement'),
  neighborhood: z.string().trim().min(2, 'validation:profile.neighborhood').max(100, 'validation:profile.neighborhood'),
});
export type AddressValues = z.infer<typeof addressSchema>;

export const accountSchema = z.object({ name: nameSchema, state: ufSchema, city: citySchema });
export type AccountValues = z.infer<typeof accountSchema>;

export const passwordChangeSchema = z
  .object({ current: z.string().min(1, 'validation:required'), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'validation:password.mismatch' })
  .refine((v) => v.password !== v.current, { path: ['password'], message: 'validation:password.same' });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export const documentSchema = z.object({
  document: z
    .custom<File | null>((v) => v === null || v instanceof File)
    .superRefine((file, ctx) => {
      if (!file) return void ctx.addIssue({ code: 'custom', message: 'validation:documentRequired' });
      const problem = fileProblem(file, DOCUMENT_TYPES);
      if (problem === 'type') ctx.addIssue({ code: 'custom', message: 'validation:documentType' });
      if (problem === 'size') ctx.addIssue({ code: 'custom', message: 'validation:fileSize' });
    }),
});
export type DocumentValues = z.infer<typeof documentSchema>;
