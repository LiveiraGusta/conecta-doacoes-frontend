import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { citySchema, emailSchema, passwordSchema, ufSchema } from './common';

/** Primeira mensagem de erro (uma chave de tradução). */
const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error!.issues[0]!.message;

describe('schemas comuns', () => {
  it('senha segue a regra da API (8–72, letra e número)', () => {
    expect(passwordSchema.safeParse('Senha123').success).toBe(true);
    expect(firstError(passwordSchema.safeParse('Ab1'))).toBe('validation:password.min');
    expect(firstError(passwordSchema.safeParse('somenteletras'))).toBe('validation:password.letterAndNumber');
    expect(firstError(passwordSchema.safeParse('12345678'))).toBe('validation:password.letterAndNumber');
    expect(firstError(passwordSchema.safeParse(`a1${'x'.repeat(71)}`))).toBe('validation:password.max');
  });

  it('e-mail: vazio é obrigatório, formato errado é e-mail inválido, espaços somem', () => {
    expect(firstError(emailSchema.safeParse(''))).toBe('validation:required');
    expect(firstError(emailSchema.safeParse('marina@'))).toBe('validation:email');
    expect(emailSchema.parse('  marina@x.com ')).toBe('marina@x.com');
  });

  it('UF e cidade', () => {
    expect(ufSchema.safeParse('SP').success).toBe(true);
    expect(firstError(ufSchema.safeParse('XX'))).toBe('validation:uf');
    expect(firstError(citySchema.safeParse(' a '))).toBe('validation:city');
  });

  it('toda chave usada existe no pt-BR (sem texto cru na tela)', () => {
    for (const key of [
      'validation:required',
      'validation:email',
      'validation:password.min',
      'validation:password.max',
      'validation:password.letterAndNumber',
      'validation:uf',
      'validation:city',
    ]) {
      expect(i18n.exists(key), key).toBe(true);
    }
  });
});
