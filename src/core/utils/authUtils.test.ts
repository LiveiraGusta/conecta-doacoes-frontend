import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { applyApiError } from './apiErrors';
import { cnpjDigits, isValidCnpj, maskCnpj } from './cnpj';
import { DOCUMENT_TYPES, fileProblem, formatBytes, MAX_UPLOAD_BYTES } from './files';

describe('CNPJ', () => {
  it('máscara progressiva', () => {
    expect(maskCnpj('11')).toBe('11');
    expect(maskCnpj('11222')).toBe('11.222');
    expect(maskCnpj('112223330001')).toBe('11.222.333/0001');
    expect(maskCnpj('11222333000181999')).toBe('11.222.333/0001-81');
    expect(cnpjDigits('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('dígitos verificadores', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(isValidCnpj('11.222.333/0001')).toBe(false);
  });
});

describe('arquivos', () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

  it('aceita PDF/JPG/PNG/WEBP até 5 MB; tipo pela extensão quando o navegador não informa', () => {
    expect(fileProblem(file('cnpj.pdf', 'application/pdf'), DOCUMENT_TYPES)).toBeNull();
    expect(fileProblem(file('cnpj.PDF', ''), DOCUMENT_TYPES)).toBeNull();
    expect(fileProblem(file('cnpj.docx', 'application/msword'), DOCUMENT_TYPES)).toBe('type');
    expect(fileProblem(file('foto.png', 'image/png', MAX_UPLOAD_BYTES + 1), DOCUMENT_TYPES)).toBe('size');
  });

  it('formatBytes em pt-BR', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('applyApiError', () => {
  const fields = ['email', 'password'] as const;

  it('VALIDATION_ERROR: cada detalhe vai para o seu campo (com alias); o que sobra volta como mensagem', () => {
    const setError = vi.fn();
    const err = new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [
      { path: 'new_password', message: 'Mínimo de 8 caracteres' },
      { path: 'outro', message: 'Campo estranho' },
    ]);
    const left = applyApiError(err, setError, { fields, aliases: { new_password: 'password' } });
    expect(setError).toHaveBeenCalledWith(
      'password',
      { type: 'server', message: 'Mínimo de 8 caracteres' },
      { shouldFocus: true },
    );
    expect(left).toBe('Campo estranho');
  });

  it('código mapeado vai para o campo; código sem mapa volta a mensagem da API', () => {
    const setError = vi.fn();
    expect(
      applyApiError(new ApiError(409, 'EMAIL_TAKEN', 'Já existe uma conta.'), setError, {
        fields,
        codes: { EMAIL_TAKEN: 'email' },
      }),
    ).toBeNull();
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'Já existe uma conta.' },
      { shouldFocus: true },
    );

    expect(
      applyApiError(new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.'), setError, { fields }),
    ).toBe('E-mail ou senha incorretos.');
    expect(applyApiError(new Error('x'), setError, { fields })).toBe('Erro inesperado. Tente de novo.');
  });
});
