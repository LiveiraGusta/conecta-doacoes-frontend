import { screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { REPORT_IDS } from '@/mocks/chats';
import { IDS } from '@/mocks/db';
import { ITEM_IDS } from '@/mocks/items';
import { expectNoA11yViolations } from './a11y';
import { renderApp } from './render';

/**
 * Acessibilidade das telas principais com axe-core (decisão da fase 8). Cada caso espera a tela carregar
 * pelo texto principal e varre o documento inteiro.
 */
const pages: [string, string, { loggedAs?: string; viewport?: 'mobile' }, RegExp][] = [
  ['feed (visitante)', '/feed', {}, /Doações de todas as cidades/],
  ['feed (ONG)', '/feed', { loggedAs: IDS.ngoActive }, /Últimas doações/],
  ['feed (celular)', '/feed', { loggedAs: IDS.donor, viewport: 'mobile' }, /Últimas doações/],
  ['detalhe do item', `/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.ngoActive }, /Observações do doador/],
  ['login', '/login', {}, /Que bom ver você/],
  ['cadastro', '/register', {}, /Quero doar/],
  ['minhas doações', '/donations', { loggedAs: IDS.donor }, /Minhas doações/],
  ['nova doação', '/donations/new', { loggedAs: IDS.donor }, /Fotos do item/],
  ['interessadas', `/donations/${ITEM_IDS.basket}/interests`, { loggedAs: IDS.donor }, /3 ONGs interessadas/],
  ['conversa', `/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.donor }, /O endereço é Av. Paulista/],
  ['página pessoal', `/u/${IDS.ngoActive}`, { loggedAs: IDS.donor }, /Doações recebidas/],
  ['perfil', '/profile', { loggedAs: IDS.ngoActive }, /Categorias aceitas/],
  ['perfil: conta', '/profile?aba=conta', { loggedAs: IDS.donor }, /Excluir conta/],
  ['configurações', '/settings', { loggedAs: IDS.donor }, /Aparência/],
  ['moderação', '/admin/ngos', { loggedAs: IDS.admin }, /Instituto Novo Começo/],
  ['denúncia', `/admin/reports/${REPORT_IDS.open}`, { loggedAs: IDS.admin }, /Linha do tempo/],
  ['fila de denúncias', '/admin/reports', { loggedAs: IDS.admin }, /Revistas antigas/],
  ['denúncia de anúncio', `/admin/reports/${REPORT_IDS.itemOpen}`, { loggedAs: IDS.admin }, /Conteúdo do anúncio/],
  ['anúncio em análise (doador)', `/items/${ITEM_IDS.magazines}`, { loggedAs: IDS.donor2 }, /fora do ar/],
  ['404', '/nao-existe', {}, /Página não encontrada/],
];

describe('acessibilidade (axe)', () => {
  it.each(pages)('%s', async (_name, path, opts, ready) => {
    renderApp(path, opts);
    await screen.findAllByText(ready);
    await expectNoA11yViolations();
  });
});
