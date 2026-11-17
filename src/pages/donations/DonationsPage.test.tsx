import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db, IDS } from '@/mocks/db';
import { ITEM_IDS } from '@/mocks/items';
import { currentUrl, renderApp } from '@/test/render';

const rowOf = (title: RegExp) =>
  screen
    .getAllByRole('article')
    .find((a) => within(a).queryByRole('link', { name: new RegExp(`Ver detalhes de ${title.source}`, 'i') }))!;

describe('Minhas doações (doador)', () => {
  it('abas com o número de cada status, filtro na URL e a ação de cada item', async () => {
    const { user, router } = renderApp('/donations', { loggedAs: IDS.donor });
    expect(await screen.findByRole('status', { name: 'Carregando suas doações…' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Minhas doações' })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Todas (9)' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('tab', { name: 'Em negociação (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Doadas (1)' })).toBeInTheDocument();
    expect(await screen.findAllByRole('article')).toHaveLength(9);

    // Disponível: interessadas; em negociação: conversa.
    expect(within(rowOf(/Cesta básica/)).getByRole('link', { name: 'Ver 3 ONGs interessadas' })).toHaveAttribute(
      'href',
      `/donations/${ITEM_IDS.basket}/interests`,
    );
    expect(
      within(rowOf(/Casaco infantil/)).getByRole('link', { name: 'Nenhuma ONG interessada ainda' }),
    ).toBeInTheDocument();
    expect(within(rowOf(/Bicicleta/)).getByRole('link', { name: 'Abrir conversa' })).toHaveAttribute(
      'href',
      `/chats/${ITEM_IDS.bike}`,
    );

    await user.click(screen.getByRole('tab', { name: 'Em negociação (2)' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/donations?status=negociacao'));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(screen.getByRole('link', { name: 'Nova doação' })).toHaveAttribute('href', '/donations/new');
  });

  it('sem doações: convite para publicar', async () => {
    db.state.items.clear();
    renderApp('/donations', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Você ainda não publicou doações' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Nova doação' })).toHaveLength(2);
  });
});

describe('Meus interesses (ONG)', () => {
  it('lista os itens curtidos com o estado de cada um e desfazer tira da lista', async () => {
    const { user } = renderApp('/donations', { loggedAs: IDS.ngoActive });
    expect(await screen.findByRole('heading', { name: 'Meus interesses' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));
    expect(screen.queryByRole('link', { name: 'Nova doação' })).not.toBeInTheDocument();
    expect(within(rowOf(/Bicicleta/)).getByText('Escolhida para você')).toBeInTheDocument();
    expect(within(rowOf(/Lote de roupas/)).getByText('Recebida pela sua ONG')).toBeInTheDocument();
    expect(within(rowOf(/Bicicleta/)).getByRole('link', { name: 'Marina S.' })).toBeInTheDocument();

    await user.click(within(rowOf(/Cesta básica/)).getByRole('button', { name: 'Desfazer interesse' }));
    expect(await screen.findByText('Interesse desfeito.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(await screen.findByRole('tab', { name: 'Todas (2)' })).toBeInTheDocument();
  });

  it('sem interesses: leva ao feed', async () => {
    db.state.interests.clear();
    renderApp('/donations', { loggedAs: IDS.ngoActive2 });
    expect(await screen.findByRole('heading', { name: 'Nenhum interesse por aqui' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver o feed' })).toHaveAttribute('href', '/feed');
  });
});

describe('ONGs interessadas', () => {
  it('ATIVO primeiro; ONG inativa sem "Escolher"; escolher confirma e abre a conversa', async () => {
    const { user, router } = renderApp(`/donations/${ITEM_IDS.basket}/interests`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: /ONGs interessadas: Cesta básica/ })).toBeInTheDocument();
    expect(await screen.findByText('3 ONGs interessadas')).toBeInTheDocument();
    const names = within(screen.getByRole('main'))
      .getAllByRole('listitem')
      .map((li) => within(li).getAllByRole('link')[0]!.textContent);
    expect(names).toEqual(['Casa do Bem', 'ONG Salvadora', 'Casa Esperança']);
    expect(screen.getByText('ONG indisponível')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Escolher / })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Escolher ONG Salvadora' }));
    const dialog = await screen.findByRole('dialog', { name: 'Escolher ONG Salvadora?' });
    await user.click(within(dialog).getByRole('button', { name: 'Escolher e conversar' }));
    await waitFor(() => expect(currentUrl(router)).toBe(`/chats/${ITEM_IDS.basket}`));
    expect(await screen.findByText('ONG Salvadora escolhida. Abrindo a conversa…')).toBeInTheDocument();
    expect(db.state.items.get(ITEM_IDS.basket)).toMatchObject({
      status: 'EM_PROGRESSO',
      selected_ngo_id: IDS.ngoActive,
    });
  });

  it('item já em negociação: aviso com a conversa, escolhida marcada e sem "Escolher"', async () => {
    renderApp(`/donations/${ITEM_IDS.bike}/interests`, { loggedAs: IDS.donor });
    expect(await screen.findByText('Esta doação já está em negociação.')).toBeInTheDocument();
    expect(await screen.findByText('Escolhida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Escolher / })).not.toBeInTheDocument();
  });

  it('a API recusa a escolha (outra aba já escolheu): mostra a mensagem e atualiza a tela', async () => {
    const { user } = renderApp(`/donations/${ITEM_IDS.basket}/interests`, { loggedAs: IDS.donor });
    await user.click(await screen.findByRole('button', { name: 'Escolher Casa do Bem' }));
    // Enquanto o diálogo está aberto, outra aba escolhe outra ONG.
    db.state.items.get(ITEM_IDS.basket)!.status = 'EM_PROGRESSO';
    db.state.items.get(ITEM_IDS.basket)!.selected_ngo_id = IDS.ngoActive;
    await user.click(screen.getByRole('button', { name: 'Escolher e conversar' }));
    expect(await screen.findByText('Este item já está em negociação ou foi doado.')).toBeInTheDocument();
    expect(await screen.findByText('Esta doação já está em negociação.')).toBeInTheDocument();
  });

  it('item de outro doador: tela de sem acesso', async () => {
    renderApp(`/donations/${ITEM_IDS.stroller}/interests`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Esta doação não é sua' })).toBeInTheDocument();
  });

  it('sem interessadas: estado vazio com a cidade', async () => {
    const casaco = [...db.state.items.values()].find((i) => i.title.startsWith('Casaco'))!;
    renderApp(`/donations/${casaco.id}/interests`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Nenhuma ONG demonstrou interesse ainda' })).toBeInTheDocument();
    expect(screen.getByText(/As ONGs de São Paulo veem/)).toBeInTheDocument();
  });
});
