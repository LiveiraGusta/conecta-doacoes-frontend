import type { UF } from '../types/api';

/** Municípios de uma UF (API pública do IBGE). Só a UF sai do app; nada do usuário. */
export const IBGE_CITIES_URL = (uf: UF) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`;

export async function fetchCities(uf: UF): Promise<string[]> {
  // fetch direto (sem o cliente da API): outro domínio, sem cookie nem header anti-CSRF.
  const res = await fetch(IBGE_CITIES_URL(uf));
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
  const list = (await res.json()) as { nome: string }[];
  return list.map((c) => c.nome);
}

/** Comparação sem acento e sem caixa: "sao paulo" encontra "São Paulo". */
export const normalizeText = (s: string) =>
  s
    .normalize('NFD') // "ã" vira "a" + til combinante
    .replace(/\p{M}/gu, '') // remove as marcas (acentos, til, cedilha)
    .toLowerCase()
    .trim();
