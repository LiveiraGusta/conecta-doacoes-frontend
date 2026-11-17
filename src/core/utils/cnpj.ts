/** Só os dígitos: "12.345.678/0001-95" → "12345678000195". */
export const cnpjDigits = (value: string) => value.replace(/\D/g, '').slice(0, 14);

/** Máscara progressiva enquanto digita: 12.345.678/0001-95. */
export function maskCnpj(value: string): string {
  const d = cnpjDigits(value);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)]
    .filter(Boolean)
    .join('.')
    .concat(d.length > 8 ? `/${d.slice(8, 12)}` : '')
    .concat(d.length > 12 ? `-${d.slice(12, 14)}` : '');
}

/** Dígitos verificadores (mesma regra da API). Recusa sequências repetidas (00000000000000). */
export function isValidCnpj(value: string): boolean {
  const d = cnpjDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(d[12]) && check(13) === Number(d[13]);
}
