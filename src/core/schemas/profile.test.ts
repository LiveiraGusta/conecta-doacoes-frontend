import { describe, expect, it } from 'vitest';
import { addressSchema, contactSchema, instagramUser, maskCep, maskPhone, passwordChangeSchema } from './profile';

const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.error?.issues.map((i) => `${i.path.join('.')}:${i.message}`) ?? [];

describe('máscaras do perfil', () => {
  it('telefone fixo e celular, com DDD', () => {
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
    expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    expect(maskPhone('119876543210000')).toBe('(11) 98765-4321');
  });

  it('CEP e Instagram', () => {
    expect(maskCep('01310100')).toBe('01310-100');
    expect(maskCep('0131')).toBe('0131');
    expect(instagramUser('@ong.salvadora')).toBe('ong.salvadora');
    expect(instagramUser('https://www.instagram.com/ongsalvadora/')).toBe('ongsalvadora');
  });
});

describe('schemas do perfil', () => {
  it('contato: tudo opcional, mas válido quando preenchido', () => {
    expect(issues(contactSchema.safeParse({ phone: '', instagram: '', website: '' }))).toEqual([]);
    expect(issues(contactSchema.safeParse({ phone: '123', instagram: 'tem espaço', website: 'site' }))).toEqual([
      'phone:validation:profile.phone',
      'instagram:validation:profile.instagram',
      'website:validation:website',
    ]);
  });

  it('endereço: CEP de 8 dígitos e campos obrigatórios', () => {
    const ok = { cep: '01310-100', street: 'Av. Paulista', number: '1000', complement: '', neighborhood: 'Bela Vista' };
    expect(issues(addressSchema.safeParse(ok))).toEqual([]);
    expect(issues(addressSchema.safeParse({ ...ok, cep: '0131', number: '' }))).toEqual([
      'cep:validation:profile.cep',
      'number:validation:required',
    ]);
  });

  it('troca de senha: regra, confirmação e diferente da atual', () => {
    expect(
      issues(passwordChangeSchema.safeParse({ current: 'Velha123', password: 'Nova12345', confirm: 'Nova12345' })),
    ).toEqual([]);
    expect(
      issues(passwordChangeSchema.safeParse({ current: 'Igual123', password: 'Igual123', confirm: 'Outra123' })),
    ).toEqual(['confirm:validation:password.mismatch', 'password:validation:password.same']);
  });
});
