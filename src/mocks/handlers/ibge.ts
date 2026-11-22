import { http, HttpResponse } from 'msw';

/**
 * IBGE falso, só para os testes (src/mocks/node.ts). No `dev:mock` a lista vem do IBGE real
 * (requisição sem handler passa direto). Uma lista curta por UF basta para testar a busca e a grafia oficial.
 */
export const MOCK_CITIES: Record<string, string[]> = {
  SP: ['Campinas', 'Santo André', 'Santos', 'São Bernardo do Campo', 'São Paulo'],
  RJ: ['Niterói', 'Rio de Janeiro'],
};

export const ibgeHandlers = [
  http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/:uf/municipios', ({ params }) =>
    HttpResponse.json((MOCK_CITIES[String(params.uf)] ?? []).map((nome, i) => ({ id: i + 1, nome }))),
  ),
];
