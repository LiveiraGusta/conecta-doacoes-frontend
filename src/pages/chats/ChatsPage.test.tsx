import { act, screen, waitFor, within } from '@testing-library/react';

/** Contador da navegação (barra lateral). */
const navBadge = (count: number) =>
  within(screen.getByRole('navigation', { name: 'Navegação principal' })).findByLabelText(
    `${count} mensagens não lidas`,
    { selector: '.MuiChip-root' },
  );
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db, IDS } from '@/mocks/db';
import { insertMessage } from '@/mocks/handlers/chats';
import { ITEM_IDS } from '@/mocks/items';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { currentUrl, renderApp } from '@/test/render';

const room = () => screen.findByRole('log', { name: 'Mensagens' });
const input = () => screen.getByRole('textbox', { name: /Mensagem para/ });
/** A outra parte manda uma mensagem (como se fosse pelo REST do outro lado): o WS falso publica os eventos. */
const incoming = (itemId: string, from: string, text: string) =>
  act(() => void insertMessage(db.state.items.get(itemId)!, from, text));

describe('Conversas (doador)', () => {
  it('lista com não lidas; abrir a sala mostra o histórico e zera o badge e o título', async () => {
    const { user, router } = renderApp('/chats', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Escolha uma conversa' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Conversas' });
    const bike = within(list).getByRole('link', { name: /ONG Salvadora/ });
    expect(within(bike).getByText('Bicicleta aro 20')).toBeInTheDocument();
    expect(within(bike).getByLabelText('2 mensagens não lidas')).toBeInTheDocument();
    expect(await navBadge(2)).toBeInTheDocument();
    await waitFor(() => expect(document.title).toMatch(/^\(2\) Conversas/));

    await user.click(bike);
    expect(currentUrl(router)).toBe(`/chats/${ITEM_IDS.bike}`);
    const log = await room();
    expect(within(log).getByText('O endereço é Av. Paulista, 1000, sala 12.')).toBeInTheDocument();
    expect(within(log).getByText('Hoje')).toBeInTheDocument();
    await waitFor(() => expect(within(list).queryByLabelText(/não lidas?/)).not.toBeInTheDocument());
    await waitFor(() => expect(document.title).toMatch(/^Conversa ·/));
  });

  it('envio otimista: aparece na hora; a resposta da outra parte chega pelo WebSocket', async () => {
    const { user } = renderApp(`/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.donor });
    const log = await room();
    await user.type(input(), 'Sábado às 10h então!{Enter}');
    expect(input()).toHaveValue('');
    expect(await within(log).findByText('Sábado às 10h então!')).toBeInTheDocument();
    await waitFor(() => expect(within(log).queryByText('Enviando…')).not.toBeInTheDocument());
    expect(within(log).getAllByText('Sábado às 10h então!')).toHaveLength(1);

    await incoming(ITEM_IDS.bike, IDS.ngoActive, 'Combinado!');
    expect(await within(log).findByText('Combinado!')).toBeInTheDocument();
    // Sala aberta e visível: não vira aviso nem não lida.
    expect(screen.queryByText('Nova mensagem de ONG Salvadora')).not.toBeInTheDocument();
  });

  it('Shift+Enter quebra linha; falha no envio deixa "Tentar de novo"', async () => {
    let fail = true;
    server.use(
      http.post(apiUrl('/chats/:itemId/messages'), () =>
        fail ? HttpResponse.json({ error: 'INTERNAL_ERROR', message: 'Falhou.' }, { status: 500 }) : undefined,
      ),
    );
    const { user } = renderApp(`/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.donor });
    const log = await room();
    await user.type(input(), 'linha 1{Shift>}{Enter}{/Shift}linha 2');
    expect(input()).toHaveValue('linha 1\nlinha 2');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await within(log).findByText('Não enviada.')).toBeInTheDocument();
    expect(await screen.findByText('Falhou.')).toBeInTheDocument();

    fail = false;
    await user.click(within(log).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(within(log).queryByText('Não enviada.')).not.toBeInTheDocument());
    expect(db.state.messages.at(-1)).toMatchObject({ message: 'linha 1\nlinha 2', sender_id: IDS.donor });
  });

  it('mensagem de outra conversa: snackbar com Abrir e o badge sobe', async () => {
    const { user, router } = renderApp('/feed', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Últimas doações (8)' });
    // Badge inicial; a lista de conversas não está carregada (o aviso busca o nome).
    await navBadge(2);
    await incoming(ITEM_IDS.milk, IDS.ngoActive2, 'Chegamos às 15h.');
    expect(await screen.findByText('Nova mensagem de Casa do Bem')).toBeInTheDocument();
    expect(await navBadge(3)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => expect(currentUrl(router)).toBe(`/chats/${ITEM_IDS.milk}`));
    expect(await within(await room()).findByText('Chegamos às 15h.')).toBeInTheDocument();
  });

  it('cancelar: aviso de denunciar antes, motivo opcional, e volta para escolher outra ONG', async () => {
    const { user, router } = renderApp(`/chats/${ITEM_IDS.milk}`, { loggedAs: IDS.donor });
    await room();
    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cancelar negociação' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancelar a negociação?' });
    expect(within(dialog).getByText(/Denuncie antes de cancelar/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Motivo (opcional)'), 'Mudei de ideia');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar negociação' }));
    await waitFor(() => expect(currentUrl(router)).toBe(`/donations/${ITEM_IDS.milk}/interests`));
    expect(await screen.findByText('Negociação cancelada. O item voltou para a vitrine.')).toBeInTheDocument();
    expect(db.state.items.get(ITEM_IDS.milk)).toMatchObject({ status: 'DISPONIVEL' });
  });

  it('denunciar: "Denunciar primeiro" no cancelamento, mínimo de 10 caracteres e denúncia repetida', async () => {
    const { user } = renderApp(`/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.donor });
    await room();
    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cancelar negociação' }));
    await user.click(await screen.findByRole('button', { name: 'Denunciar primeiro' }));
    const dialog = await screen.findByRole('dialog', { name: 'Denunciar ONG Salvadora' });
    await user.type(within(dialog).getByLabelText('O que aconteceu?'), 'curto');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));
    expect(within(dialog).getByText('Escreva ao menos 10 caracteres')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('O que aconteceu?'), ' demais, pediu dinheiro');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));
    expect(await screen.findByText('Denúncia enviada. A equipe vai analisar.')).toBeInTheDocument();
    expect([...db.state.reports.values()].filter((r) => r.item_id === ITEM_IDS.bike)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Denunciar' }));
    const again = await screen.findByRole('dialog', { name: 'Denunciar ONG Salvadora' });
    await user.type(within(again).getByLabelText('O que aconteceu?'), 'De novo a mesma coisa.');
    await user.click(within(again).getByRole('button', { name: 'Enviar denúncia' }));
    expect(await within(again).findByText(/Você já denunciou esta negociação/)).toBeInTheDocument();
  });

  it('doação concluída: só leitura, na aba Concluídas', async () => {
    const { user } = renderApp(`/chats/${ITEM_IDS.babyClothes}`, { loggedAs: IDS.donor });
    await room();
    expect(screen.getByText('Doação concluída. A conversa fica disponível só para leitura.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Mensagem para/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Concluídas' }));
    expect(await screen.findByRole('link', { name: /Lote de roupas de bebê/ })).toBeInTheDocument();
  });

  it('conversa de outra pessoa ou inexistente: "Conversa não encontrada"', async () => {
    renderApp(`/chats/${ITEM_IDS.stroller}`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Conversa não encontrada' })).toBeInTheDocument();
  });
});

describe('Conversas (ONG)', () => {
  it('confirmar recebimento conclui a doação e a sala vira só leitura', async () => {
    const { user } = renderApp(`/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.ngoActive });
    await room();
    await user.click(screen.getByRole('button', { name: 'Confirmar recebimento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar que recebeu Bicicleta aro 20?' });
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar recebimento' }));
    expect(await screen.findByText(/Doação concluída! Obrigado/)).toBeInTheDocument();
    expect(
      await screen.findByText('Doação concluída. A conversa fica disponível só para leitura.'),
    ).toBeInTheDocument();
    expect(db.state.items.get(ITEM_IDS.bike)).toMatchObject({ status: 'DOADO' });
  });

  it('o doador cancela com a sala aberta: aviso e conversa encerrada', async () => {
    renderApp(`/chats/${ITEM_IDS.bike}`, { loggedAs: IDS.ngoActive });
    await room();
    // O doador cancela do aparelho dele.
    await act(async () => {
      db.loginAs(IDS.donor);
      await fetch(apiUrl(`/items/${ITEM_IDS.bike}/cancel`), {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' },
        body: '{}',
      });
      db.loginAs(IDS.ngoActive);
    });
    expect(
      await screen.findByText('A negociação de "Bicicleta aro 20" foi cancelada pela outra parte.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Esta negociação foi cancelada. A conversa foi encerrada.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Mensagem para/ })).not.toBeInTheDocument();
  });
});

describe('Conversas (mobile)', () => {
  it('lista e sala em telas separadas, com voltar', async () => {
    const { user, router } = renderApp('/chats', { loggedAs: IDS.donor, viewport: 'mobile' });
    await user.click(await screen.findByRole('link', { name: /Casa do Bem/ }));
    await room();
    expect(screen.queryByRole('list', { name: 'Conversas' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para as conversas' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/chats'));
    expect(await screen.findByRole('list', { name: 'Conversas' })).toBeInTheDocument();
  });
});
