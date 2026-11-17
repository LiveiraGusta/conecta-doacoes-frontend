import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REPORT_IDS } from '@/mocks/chats';
import { db, IDS } from '@/mocks/db';
import { currentUrl, renderApp } from '@/test/render';

const pending = () => db.state.users.get(IDS.ngoPending)!.user.ngo_profile!;

describe('Moderação de ONGs', () => {
  it('fila em análise; analisar mostra o documento e aprovar pede confirmação', async () => {
    const { user, router } = renderApp('/admin/ngos', { loggedAs: IDS.admin });
    const row = (await screen.findByText('Instituto Novo Começo')).closest('tr')!;
    expect(within(row).getByText('45.997.418/0001-53')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Analisar Instituto Novo Começo' }));
    expect(currentUrl(router)).toBe(`/admin/ngos?ngo=${pending().id}`);
    const modal = await screen.findByRole('dialog', { name: 'Analisar Instituto Novo Começo' });
    expect(within(modal).getByTitle('Documento de Instituto Novo Começo')).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/svg\+xml/),
    );
    expect(within(modal).getByRole('link', { name: 'Abrir em nova aba' })).toHaveAttribute('target', '_blank');

    await user.click(within(modal).getByRole('button', { name: 'Aprovar' }));
    const confirm = await screen.findByRole('dialog', { name: 'Aprovar Instituto Novo Começo?' });
    await user.click(within(confirm).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Instituto Novo Começo aprovada.')).toBeInTheDocument();
    expect(pending().status).toBe('ATIVO');
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/ngos'));
    expect(await screen.findByText('Nenhuma ONG esperando análise. 🎉')).toBeInTheDocument();
  });

  it('rejeitar: motivo pronto preenche o texto; menos de 10 caracteres não envia', async () => {
    const { user } = renderApp(`/admin/ngos?ngo=${pending().id}`, { loggedAs: IDS.admin });
    const modal = await screen.findByRole('dialog', { name: 'Analisar Instituto Novo Começo' });
    await user.click(within(modal).getByRole('button', { name: 'Rejeitar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rejeitar Instituto Novo Começo' });
    const reason = within(dialog).getByLabelText('Motivo');
    await user.type(reason, 'curto');
    await user.click(within(dialog).getByRole('button', { name: 'Rejeitar ONG' }));
    expect(within(dialog).getByText('Escreva ao menos 10 caracteres')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'CNPJ não confere' }));
    expect(reason).toHaveValue('O CNPJ do documento não confere com o informado no cadastro.');
    await user.click(within(dialog).getByRole('button', { name: 'Rejeitar ONG' }));
    expect(await screen.findByText('Instituto Novo Começo rejeitada. A ONG vai ver o motivo.')).toBeInTheDocument();
    expect(pending()).toMatchObject({ status: 'REJEITADO', rejection_reason: expect.stringMatching(/CNPJ/) });
  });

  it('abas na URL: rejeitadas mostra o motivo na ficha', async () => {
    const { user, router } = renderApp('/admin/ngos', { loggedAs: IDS.admin });
    await user.click(await screen.findByRole('tab', { name: 'Rejeitadas' }));
    expect(currentUrl(router)).toBe('/admin/ngos?status=rejeitadas');
    await user.click(await screen.findByRole('button', { name: 'Analisar Casa Esperança' }));
    const modal = await screen.findByRole('dialog', { name: 'Analisar Casa Esperança' });
    expect(within(modal).getByText(/O documento enviado está ilegível/)).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();
  });

  it('celular: cards no lugar da tabela', async () => {
    renderApp('/admin/ngos', { loggedAs: IDS.admin, viewport: 'mobile' });
    expect(await screen.findByText('Instituto Novo Começo')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Denúncias', () => {
  it('fila de abertas leva ao detalhe com partes, conversa destacada e linha do tempo', async () => {
    const { user, router } = renderApp('/admin/reports', { loggedAs: IDS.admin });
    await user.click(await screen.findByRole('link', { name: 'Ver denúncia sobre Leite em pó (6 latas)' }));
    await waitFor(() => expect(currentUrl(router)).toBe(`/admin/reports/${REPORT_IDS.open}`));

    expect(await screen.findByRole('heading', { name: /Denúncia sobre Leite em pó/ })).toBeInTheDocument();
    expect(screen.getByText('Pediram dinheiro por Pix para buscar a doação. Achei estranho.')).toBeInTheDocument();
    const conversation = screen.getByRole('region', { name: 'Conversa' });
    const flagged = within(conversation).getAllByText('Mensagem da denunciada');
    expect(flagged.length).toBeGreaterThan(0);
    expect(within(conversation).getByText(/R\$ 30/)).toBeInTheDocument();
    const timeline = screen.getByRole('region', { name: 'Linha do tempo' });
    expect(within(timeline).getByText('ONG escolhida')).toBeInTheDocument();
  });

  it('atalho para a moderação da ONG denunciada abre a ficha dela, mesmo aprovada', async () => {
    const { user, router } = renderApp(`/admin/reports/${REPORT_IDS.open}`, { loggedAs: IDS.admin });
    await user.click(await screen.findByRole('link', { name: 'Abrir na moderação de ONGs' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ngos'));
    const modal = await screen.findByRole('dialog', { name: 'Analisar Casa do Bem' });
    expect(within(modal).getByText('Aprovada')).toBeInTheDocument();
  });

  it('marcar como resolvida e ver na aba Resolvidas', async () => {
    const { user } = renderApp(`/admin/reports/${REPORT_IDS.open}`, { loggedAs: IDS.admin });
    await user.click(await screen.findByRole('button', { name: 'Marcar como resolvida' }));
    expect(await screen.findByText('Denúncia resolvida.')).toBeInTheDocument();
    expect(await screen.findByText('Esta denúncia já foi resolvida.')).toBeInTheDocument();
    expect(db.state.reports.get(REPORT_IDS.open)?.status).toBe('RESOLVIDA');
  });

  it('denúncia que não existe', async () => {
    renderApp('/admin/reports/00000000-0000-4000-8000-000000000000', { loggedAs: IDS.admin });
    expect(await screen.findByRole('heading', { name: 'Denúncia não encontrada' })).toBeInTheDocument();
  });
});
