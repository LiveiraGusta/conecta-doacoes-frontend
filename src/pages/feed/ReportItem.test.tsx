import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db, IDS } from '@/mocks/db';
import { ITEM_IDS } from '@/mocks/items';
import { currentUrl, renderApp } from '@/test/render';

const itemReports = (itemId: string) =>
  [...db.state.reports.values()].filter((r) => r.item_id === itemId && r.kind === 'ITEM');

describe('Denunciar anúncio', () => {
  it('ONG escolhe o motivo e envia; o link vira "Você denunciou este anúncio"', async () => {
    const { user } = renderApp(`/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.ngoActive });
    await screen.findByRole('heading', { name: 'Calças jeans (adulto)' });
    await user.click(screen.getByRole('button', { name: 'Denunciar anúncio' }));
    const dialog = await screen.findByRole('dialog', { name: 'Denunciar anúncio' });

    // Sem motivo não envia; "Outro" exige descrição.
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));
    expect(within(dialog).getByText('Escolha um motivo')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: /Outro motivo/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));
    expect(within(dialog).getByText('Descreva o problema em ao menos 10 caracteres')).toBeInTheDocument();
    expect(itemReports(ITEM_IDS.jeans)).toHaveLength(0);

    await user.click(within(dialog).getByRole('radio', { name: /Discurso de ódio/ }));
    await user.type(within(dialog).getByLabelText(/Quer contar mais/), 'Ofensa na descrição.');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));

    expect(await screen.findByText(/Denúncia enviada\. Obrigado/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Denunciar anúncio' })).not.toBeInTheDocument());
    expect(screen.getByText('Você denunciou este anúncio')).toBeInTheDocument();
    expect(itemReports(ITEM_IDS.jeans)).toEqual([
      expect.objectContaining({ reporter_id: IDS.ngoActive, category: 'ODIO', reason: 'Ofensa na descrição.' }),
    ]);
  });

  it('já denunciado: avisa sem erro', async () => {
    db.state.reports.set('r-existente', {
      id: 'r-existente',
      item_id: ITEM_IDS.jeans,
      reporter_id: IDS.donor2,
      reported_id: IDS.donor,
      kind: 'ITEM',
      category: 'SPAM',
      reason: null,
      status: 'ABERTA',
      resolution: null,
      created_at: new Date().toISOString(),
    });
    const { user } = renderApp(`/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.donor2 });
    await user.click(await screen.findByRole('button', { name: 'Denunciar anúncio' }));
    const dialog = await screen.findByRole('dialog', { name: 'Denunciar anúncio' });
    await user.click(within(dialog).getByRole('radio', { name: /Golpe/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Enviar denúncia' }));
    expect(await screen.findByText('Você já denunciou este anúncio. Nossa equipe vai analisar.')).toBeInTheDocument();
    expect(itemReports(ITEM_IDS.jeans)).toHaveLength(1);
  });

  it('o dono do anúncio não vê o link', async () => {
    renderApp(`/items/${ITEM_IDS.jeans}`, { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Calças jeans (adulto)' });
    expect(screen.queryByRole('button', { name: 'Denunciar anúncio' })).not.toBeInTheDocument();
  });

  it('visitante: o link pede login voltando ao item', async () => {
    const { user, router } = renderApp(`/items/${ITEM_IDS.jeans}`);
    await user.click(await screen.findByRole('button', { name: 'Denunciar anúncio' }));
    const dialog = await screen.findByRole('dialog', { name: 'Entre para continuar' });
    await user.click(within(dialog).getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(currentUrl(router)).toBe(`/login?redirect=${encodeURIComponent(`/items/${ITEM_IDS.jeans}`)}`),
    );
  });
});

describe('Anúncio fora do ar, visto pelo doador', () => {
  it('detalhe com o aviso "em análise" e sem o link de denúncia', async () => {
    renderApp(`/items/${ITEM_IDS.magazines}`, { loggedAs: IDS.donor2 });
    expect(await screen.findByRole('heading', { name: 'Revistas antigas' })).toBeInTheDocument();
    expect(screen.getByText(/recebeu denúncias e está fora do ar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Denunciar anúncio' })).not.toBeInTheDocument();
  });

  it('quem está de fora recebe "Item não encontrado"', async () => {
    renderApp(`/items/${ITEM_IDS.magazines}`, { loggedAs: IDS.ngoActive });
    expect(await screen.findByRole('heading', { name: 'Item não encontrado' })).toBeInTheDocument();
  });

  it('"Minhas doações": selo e motivo da remoção', async () => {
    const item = db.state.items.get(ITEM_IDS.magazines)!;
    item.moderation_status = 'REMOVIDO';
    item.moderation_reason = 'Capa com nudez.';
    renderApp('/donations', { loggedAs: IDS.donor2 });
    const row = (await screen.findByRole('link', { name: /Ver detalhes de Revistas antigas/ })).closest('article')!;
    expect(within(row).getByText('Removido pela moderação')).toBeInTheDocument();
    expect(within(row).getByText('Motivo: Capa com nudez.')).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: /interessada/ })).not.toBeInTheDocument();
  });
});
