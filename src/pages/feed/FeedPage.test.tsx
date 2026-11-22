import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db, IDS } from '@/mocks/db';
import { ITEM_IDS, makeItem } from '@/mocks/items';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { currentUrl, renderApp } from '@/test/render';

const cards = () => screen.getAllByRole('article');
const card = (title: RegExp) =>
  cards().find((c) => within(c).queryByRole('link', { name: new RegExp(`Ver detalhes de ${title.source}`, 'i') }))!;

describe('Feed', () => {
  it('logado: título com o total da cidade, skeleton enquanto carrega e cards com doador e categoria', async () => {
    renderApp('/feed', { loggedAs: IDS.donor });
    expect(await screen.findByRole('status', { name: 'Carregando doações…' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Últimas doações (8)' })).toBeInTheDocument();
    expect(cards()).toHaveLength(8);
    const jeans = card(/Calças jeans/);
    expect(within(jeans).getByRole('link', { name: 'Marina S.' })).toHaveAttribute('href', `/u/${IDS.donor}`);
    expect(within(jeans).getByText('Roupas')).toBeInTheDocument();
    expect(within(jeans).getByText(/São Paulo - SP/)).toBeInTheDocument();
    // Doador não tem botão de interesse.
    expect(screen.queryByRole('button', { name: 'Tenho interesse' })).not.toBeInTheDocument();
  });

  it('visitante: todas as cidades, sem nome de pessoas, e "Tenho interesse" pede login voltando ao item', async () => {
    const { user, router } = renderApp('/feed');
    expect(await screen.findByRole('heading', { name: 'Doações de todas as cidades (13)' })).toBeInTheDocument();
    expect(screen.queryByText('Marina S.')).not.toBeInTheDocument();
    expect(within(card(/Calças jeans/)).getByText('Doador')).toBeInTheDocument();

    await user.click(within(card(/Calças jeans/)).getByRole('button', { name: 'Tenho interesse' }));
    const dialog = await screen.findByRole('dialog', { name: 'Entre para continuar' });
    await user.click(within(dialog).getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(currentUrl(router)).toBe(`/login?redirect=${encodeURIComponent(`/items/${ITEM_IDS.jeans}`)}`),
    );
  });

  it('categoria vai para a URL e filtra; "Todos" limpa', async () => {
    const { user, router } = renderApp('/feed', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    await user.click(screen.getByRole('button', { name: 'Livros' }));
    expect(await screen.findByRole('heading', { name: 'Últimas doações (2)' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/feed?categoria=livros');
    expect(screen.getByRole('button', { name: 'Livros' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(await screen.findByRole('heading', { name: 'Últimas doações (8)' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/feed');
  });

  it('filtros vindos da URL valem na abertura; categoria desconhecida é ignorada', async () => {
    renderApp('/feed?categoria=alimentos', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Últimas doações (2)' })).toBeInTheDocument();
  });

  it('busca com espera (debounce) vai para a URL; sem resultado mostra "Nada encontrado" e limpa os filtros', async () => {
    const { user, router } = renderApp('/feed', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    const search = within(screen.getByRole('search')).getByRole('searchbox', { name: 'Pesquisar doações' });

    await user.type(search, 'bicicleta');
    expect(currentUrl(router)).toBe('/feed'); // ainda esperando
    await waitFor(() => expect(currentUrl(router)).toBe('/feed?busca=bicicleta'));
    expect(await screen.findByRole('heading', { name: 'Últimas doações (1)' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'xyz{Enter}');
    expect(await screen.findByRole('heading', { name: 'Nada encontrado' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByRole('heading', { name: 'Últimas doações (8)' })).toBeInTheDocument();
    expect(search).toHaveValue('');
  });

  it('cidade sem doações: estado vazio com o nome da cidade', async () => {
    db.state.users.get(IDS.donor)!.user.city = 'Santos';
    renderApp('/feed', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Nenhuma doação por aqui ainda' })).toBeInTheDocument();
    expect(screen.getByText(/Quando alguém de Santos publicar/)).toBeInTheDocument();
  });

  it('erro ao carregar: mensagem com "Tentar de novo" que recarrega', async () => {
    server.use(http.get(apiUrl('/items/feed'), () => HttpResponse.json({ error: 'X', message: 'x' }, { status: 500 })));
    const { user } = renderApp('/feed', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Não deu para carregar o feed' })).toBeInTheDocument();
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Últimas doações (8)' })).toBeInTheDocument();
  });

  it('mais de uma página: "Carregar mais" traz o resto sem repetir', async () => {
    for (let i = 0; i < 10; i++) {
      const item = makeItem({
        donor_id: IDS.donor2,
        title: `Item extra ${i}`,
        description: null,
        notes: null,
        category: 'LIVROS',
        city: 'São Paulo',
        state: 'SP',
        status: 'DISPONIVEL',
        selected_ngo_id: null,
        hoursAgo: 200 + i,
      });
      db.state.items.set(item.id, item);
    }
    const { user } = renderApp('/feed', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Últimas doações (18)' })).toBeInTheDocument();
    expect(cards()).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(cards()).toHaveLength(18));
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
    expect(screen.getByText('Você viu todas as doações.')).toBeInTheDocument();
  });
});

describe('Feed: interesse da ONG', () => {
  it('"Tenho interesse" muda na hora, avisa com "Desfazer", e desfazer volta', async () => {
    const { user } = renderApp('/feed', { loggedAs: IDS.ngoActive });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    const jeans = card(/Calças jeans/);

    await user.click(within(jeans).getByRole('button', { name: 'Tenho interesse' }));
    expect(within(jeans).getByRole('button', { name: 'Desfazer interesse' })).toBeInTheDocument();
    const snack = await screen.findByRole('alert');
    expect(snack).toHaveTextContent('Interesse registrado');
    await waitFor(() => expect(db.hasInterest(ITEM_IDS.jeans, IDS.ngoActive)).toBe(true));

    await user.click(within(snack).getByRole('button', { name: 'Desfazer' }));
    expect(await within(jeans).findByRole('button', { name: 'Tenho interesse' })).toBeInTheDocument();
    await waitFor(() => expect(db.hasInterest(ITEM_IDS.jeans, IDS.ngoActive)).toBe(false));
  });

  it('API recusa (item saiu do ar): volta o botão e mostra a mensagem dela', async () => {
    server.use(
      http.post(apiUrl('/items/:id/interest'), () =>
        HttpResponse.json(
          { error: 'ITEM_NOT_AVAILABLE', message: 'Este item já está em negociação ou foi doado.' },
          { status: 409 },
        ),
      ),
    );
    const { user } = renderApp('/feed', { loggedAs: IDS.ngoActive });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    await user.click(within(card(/Calças jeans/)).getByRole('button', { name: 'Tenho interesse' }));
    expect(await screen.findByText('Este item já está em negociação ou foi doado.')).toBeInTheDocument();
    expect(within(card(/Calças jeans/)).getByRole('button', { name: 'Tenho interesse' })).toBeInTheDocument();
  });

  it('item escolhido para a ONG: selo e atalho para a conversa; em negociação com outra: só o selo', async () => {
    renderApp('/feed', { loggedAs: IDS.ngoActive });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    const bike = card(/Bicicleta/);
    expect(within(bike).getByText('Escolhida para você')).toBeInTheDocument();
    expect(within(bike).getByRole('link', { name: 'Abrir conversa' })).toHaveAttribute(
      'href',
      `/chats/${ITEM_IDS.bike}`,
    );
    const milk = card(/Leite em pó/);
    expect(within(milk).getByText('Em negociação')).toBeInTheDocument();
    expect(within(milk).queryByRole('button', { name: /interesse/ })).toBeNull();
  });

  it('ONG em análise não vê o botão (o banner explica)', async () => {
    renderApp('/feed', { loggedAs: IDS.ngoPending });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    expect(screen.queryByRole('button', { name: 'Tenho interesse' })).not.toBeInTheDocument();
  });
});

describe('Detalhe do item', () => {
  it('desktop: abre em modal sobre o feed com as observações; fechar volta ao feed com os filtros', async () => {
    const { user, router } = renderApp('/feed?categoria=roupas', { loggedAs: IDS.ngoActive });
    await screen.findByRole('heading', { name: 'Últimas doações (2)' });
    await user.click(screen.getByRole('link', { name: /Ver detalhes de Calças jeans/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Calças jeans (adulto)' });
    expect(currentUrl(router)).toBe(`/items/${ITEM_IDS.jeans}`);
    expect(await within(dialog).findByText('Observações do doador')).toBeInTheDocument();
    expect(within(dialog).getByText(/Retirada em Bela Vista/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tenho interesse' })).toBeInTheDocument();
    // O feed (com o filtro) continua por trás.
    expect(screen.getByRole('heading', { name: 'Últimas doações (2)', hidden: true })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed?categoria=roupas'));
  });

  it('desktop com link direto: página com "Voltar para o feed"', async () => {
    const { user, router } = renderApp(`/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Calças jeans (adulto)' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para o feed' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
  });

  it('visitante: sem observações nem nome do doador, com convite para entrar', async () => {
    renderApp(`/items/${ITEM_IDS.jeans}`);
    expect(await screen.findByRole('heading', { name: 'Calças jeans (adulto)' })).toBeInTheDocument();
    expect(screen.queryByText('Observações do doador')).not.toBeInTheDocument();
    expect(screen.getByText('Doador')).toBeInTheDocument();
    expect(screen.getByText(/Entre para ver quem está doando/)).toBeInTheDocument();
  });

  it('item que não existe: "Item não encontrado"', async () => {
    renderApp('/items/00000000-0000-4000-8000-000000000000', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Item não encontrado' })).toBeInTheDocument();
  });

  it('mobile: página com voltar, data completa e "Confirmar interesse"', async () => {
    renderApp(`/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.ngoActive, viewport: 'mobile' });
    expect(await screen.findByRole('heading', { name: 'Calças jeans (adulto)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar para o feed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar interesse' })).toBeInTheDocument();
    expect(screen.getByText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/)).toBeInTheDocument();
  });
});

describe('Feed mobile e localização', () => {
  it('mobile: busca e chips na página, cards com data completa', async () => {
    renderApp('/feed', { loggedAs: IDS.donor, viewport: 'mobile' });
    expect(await screen.findByRole('heading', { name: 'Últimas doações (8)' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Pesquisar doações' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtrar por categoria' })).toBeInTheDocument();
    expect(within(card(/Calças jeans/)).getByText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('trocar a cidade pelo header (desktop): PATCH /profile, feed da nova cidade e aviso', async () => {
    const { user } = renderApp('/feed', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    await user.click(screen.getByRole('button', { name: 'Trocar localização: São Paulo - SP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sua localização' });
    const city = within(dialog).getByRole('combobox', { name: 'Cidade' });
    await user.clear(city);
    await user.type(city, 'campinas');
    await user.click(await screen.findByRole('option', { name: 'Campinas' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar localização' }));

    expect(await screen.findByText('Localização atualizada. Mostrando doações de Campinas.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Últimas doações (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar localização: Campinas - SP' })).toBeInTheDocument();
  });

  it('mobile: a localização fica num botão acima das categorias', async () => {
    const { user } = renderApp('/feed', { loggedAs: IDS.donor, viewport: 'mobile' });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    await user.click(screen.getByRole('button', { name: 'Trocar localização: São Paulo - SP' }));
    expect(await screen.findByRole('dialog', { name: 'Sua localização' })).toBeInTheDocument();
  });
});
