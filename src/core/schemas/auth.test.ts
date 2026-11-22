import { describe, expect, it } from 'vitest';
import { donorRegisterSchema, loginSchema, ngoRegisterSchema, resetPasswordSchema } from './auth';

const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

const donor = { name: 'Ana Lima', email: 'ana@x.com', password: 'Senha123', state: 'SP', city: 'Campinas' };
const pdf = new File(['%PDF-1.4'], 'cnpj.pdf', { type: 'application/pdf' });

describe('schemas de autenticação', () => {
  it('login só exige senha preenchida (a regra fica com a API)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
    expect(issues(loginSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'validation:required',
      password: 'validation:required',
    });
  });

  it('cadastro de doador: nome, senha, UF e cidade', () => {
    expect(donorRegisterSchema.safeParse(donor).success).toBe(true);
    expect(
      issues(donorRegisterSchema.safeParse({ ...donor, name: 'A', password: 'abc1', state: '', city: '' })),
    ).toEqual({
      name: 'validation:name',
      password: 'validation:password.min',
      state: 'validation:uf',
      city: 'validation:city',
    });
  });

  it('cadastro de ONG: CNPJ válido, site opcional com http(s) e documento obrigatório', () => {
    const ok = { ...donor, cnpj: '11.222.333/0001-81', website: '', document: pdf };
    expect(ngoRegisterSchema.safeParse(ok).success).toBe(true);
    expect(ngoRegisterSchema.safeParse({ ...ok, website: 'https://ong.org.br' }).success).toBe(true);
    expect(
      issues(ngoRegisterSchema.safeParse({ ...ok, cnpj: '11.222.333/0001-80', website: 'ong.org', document: null })),
    ).toEqual({
      cnpj: 'validation:cnpj',
      website: 'validation:website',
      document: 'validation:documentRequired',
    });
    const docx = new File(['x'], 'cnpj.docx', { type: 'application/msword' });
    expect(issues(ngoRegisterSchema.safeParse({ ...ok, document: docx }))).toEqual({
      document: 'validation:documentType',
    });
  });

  it('nova senha: regra da API e confirmação igual', () => {
    expect(resetPasswordSchema.safeParse({ password: 'Senha123', confirm: 'Senha123' }).success).toBe(true);
    expect(issues(resetPasswordSchema.safeParse({ password: 'Senha123', confirm: 'Senha124' }))).toEqual({
      confirm: 'validation:password.mismatch',
    });
  });
});
