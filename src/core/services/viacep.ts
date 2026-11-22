/** Endereço que o ViaCEP devolve (só o que o formulário usa). */
export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const VIACEP_URL = 'https://viacep.com.br/ws';

/**
 * Busca o endereço pelo CEP (plano: ViaCEP, só o CEP sai do app; sem cookie nem header nosso).
 * `null` quando o CEP não existe ou o serviço falha: o formulário segue para preenchimento manual.
 */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`${VIACEP_URL}/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
