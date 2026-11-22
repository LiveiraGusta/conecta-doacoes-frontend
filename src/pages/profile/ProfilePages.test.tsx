import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db, IDS, MOCK_PASSWORD } from '@/mocks/db';
import { server } from '@/mocks/node';
import { apiUrl } from '@/mocks/utils';
import { currentUrl, renderApp } from '@/test/render';

const ngo = () => db.state.users.get(IDS.ngoActive)!.user;
const section = (name: string) => screen.getByRole('region', { name });

describe('Página pessoal', () => {
  it('ONG vista por quem está logado: banner, categorias, contato com mapa e WhatsApp, doações recebidas', async () => {
    renderApp(`/u/${IDS.ngoActive}`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'ONG Salvadora', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Roupas', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5511987654321');
    expect(screen.getByRole('link', { name: 'Abrir no mapa' }).getAttribute('href')).toContain('google.com/maps');
    expect(screen.getByRole('link', { name: '@ongsalvadora' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Doações recebidas (1)' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Lote de roupas de bebê/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar perfil' })).not.toBeInTheDocument();
  });

  it('visitante: sem nome nem contatos, com convite para entrar', async () => {
    renderApp(`/u/${IDS.ngoActive}`);
    expect(await screen.findByText('Entre para ver o nome, a foto e os contatos.')).toBeInTheDocument();
    expect(screen.queryByText('ONG Salvadora')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Contato' })).not.toBeInTheDocument();
    expect(screen.getByText('1 doação')).toBeInTheDocument();
  });

  it('doador que oculta as doações: os outros veem o aviso; ele vê a lista e a dica', async () => {
    db.state.users.get(IDS.donor)!.user.preferences.show_donations = false;
    const other = renderApp(`/u/${IDS.donor}`, { loggedAs: IDS.ngoActive });
    expect(await screen.findByRole('heading', { name: 'Marina S.', level: 2 })).toBeInTheDocument();
    expect(await screen.findByText('Este doador prefere não mostrar as doações.')).toBeInTheDocument();
    other.unmount();

    renderApp(`/u/${IDS.donor}`, { loggedAs: IDS.donor });
    expect(await screen.findByText(/Só você vê esta lista/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Lote de roupas de bebê/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/profile');
  });

  it('usuário que não existe: página não encontrada', async () => {
    renderApp(`/u/${IDS.admin}`, { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});

describe('Perfil: Minha página', () => {
  it('cada seção salva sozinha: descrição, contato com máscara, categorias e endereço pelo CEP', async () => {
    const { user } = renderApp('/profile', { loggedAs: IDS.ngoActive });
    const about = await screen.findByRole('region', { name: 'Sobre' });
    const saveAbout = within(about).getByRole('button', { name: 'Salvar' });
    expect(saveAbout).toBeDisabled();
    await user.clear(within(about).getByLabelText('Descrição'));
    await user.type(within(about).getByLabelText('Descrição'), 'Atendemos 300 famílias.');
    await user.click(saveAbout);
    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(ngo().bio).toBe('Atendemos 300 famílias.');

    const contact = section('Contato');
    const phone = within(contact).getByLabelText('Telefone ou WhatsApp');
    await user.clear(phone);
    await user.type(phone, '2134567890');
    expect(phone).toHaveValue('(21) 3456-7890');
    await user.clear(within(contact).getByLabelText('Instagram'));
    await user.type(within(contact).getByLabelText('Instagram'), '@nova.ong');
    await user.click(within(contact).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(ngo().ngo_profile).toMatchObject({ phone: '2134567890', instagram: 'nova.ong' }));

    const categories = section('Categorias aceitas');
    await user.click(within(categories).getByRole('button', { name: 'Comida' }));
    expect(within(categories).getByRole('button', { name: 'Comida' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(categories).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(ngo().ngo_profile?.accepted_categories).toContain('ALIMENTOS'));

    const address = section('Endereço');
    const cep = within(address).getByLabelText('CEP');
    await user.clear(cep);
    await user.type(cep, '01001000');
    await waitFor(() => expect(within(address).getByLabelText('Rua')).toHaveValue('Praça da Sé'));
    expect(within(address).getByLabelText('Bairro')).toHaveValue('Sé');
    await user.click(within(address).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(ngo().ngo_profile?.address).toMatchObject({ cep: '01001000', street: 'Praça da Sé' }));
  });

  it('CEP não encontrado: avisa e deixa preencher à mão; doador não vê as seções de ONG', async () => {
    const { user } = renderApp('/profile', { loggedAs: IDS.ngoActive });
    const address = await screen.findByRole('region', { name: 'Endereço' });
    const cep = within(address).getByLabelText('CEP');
    await user.clear(cep);
    await user.type(cep, '99999999');
    expect(await within(address).findByText(/CEP não encontrado/)).toBeInTheDocument();
  });

  it('doador: foto, sobre e nada de banner, contato ou endereço', async () => {
    renderApp('/profile', { loggedAs: IDS.donor });
    expect(await screen.findByRole('region', { name: 'Foto de perfil' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sobre' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Banner da ONG' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Endereço' })).not.toBeInTheDocument();
  });
});

describe('Perfil: Conta', () => {
  it('senha: erro da senha atual no campo; sucesso avisa e limpa', async () => {
    const { user } = renderApp('/profile?aba=conta', { loggedAs: IDS.donor });
    const box = await screen.findByRole('region', { name: 'Senha' });
    await user.type(within(box).getByLabelText('Senha atual'), 'errada1');
    await user.type(within(box).getByLabelText('Nova senha'), 'Nova12345');
    await user.type(within(box).getByLabelText('Repita a nova senha'), 'Nova12345');
    await user.click(within(box).getByRole('button', { name: 'Trocar senha' }));
    expect(await within(box).findByText('A senha atual não confere.')).toBeInTheDocument();

    await user.clear(within(box).getByLabelText('Senha atual'));
    await user.type(within(box).getByLabelText('Senha atual'), MOCK_PASSWORD);
    await user.click(within(box).getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('Senha alterada. As outras sessões foram encerradas.')).toBeInTheDocument();
    expect(within(box).getByLabelText('Senha atual')).toHaveValue('');
  });

  it('excluir conta com negociação aberta: mensagem da API e atalho para as conversas', async () => {
    const { user } = renderApp('/profile?aba=conta', { loggedAs: IDS.donor });
    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir a conta?' });
    await user.type(within(dialog).getByLabelText('Confirme com a sua senha'), MOCK_PASSWORD);
    await user.click(within(dialog).getByRole('button', { name: 'Excluir definitivamente' }));
    expect(await within(dialog).findByText(/negociações em andamento/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Ver conversas' })).toHaveAttribute('href', '/chats');
  });

  it('excluir conta: sai do app e volta ao feed como visitante', async () => {
    const { user, router } = renderApp('/profile?aba=conta', { loggedAs: IDS.donor2 });
    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir a conta?' });
    await user.type(within(dialog).getByLabelText('Confirme com a sua senha'), MOCK_PASSWORD);
    await user.click(within(dialog).getByRole('button', { name: 'Excluir definitivamente' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
    expect(await screen.findByText('Sua conta foi excluída.')).toBeInTheDocument();
    expect(db.state.users.has(IDS.donor2)).toBe(false);
  });

  it('ONG rejeitada: motivo e área para reenviar o documento', async () => {
    renderApp('/profile?aba=conta', { loggedAs: IDS.ngoRejected });
    const status = await screen.findByRole('region', { name: 'Situação da ONG' });
    expect(within(status).getByText('Não aprovada')).toBeInTheDocument();
    expect(within(status).getByText(/O documento enviado está ilegível/)).toBeInTheDocument();
    expect(within(status).getByRole('button', { name: 'Enviar novo documento' })).toBeInTheDocument();
  });
});

describe('Configurações', () => {
  it('cor e modo mudam na hora e ficam salvos na conta', async () => {
    const { user } = renderApp('/settings', { loggedAs: IDS.ngoActive });
    await user.click(await screen.findByRole('radio', { name: 'Verde' }));
    expect(screen.getByRole('radio', { name: 'Verde' })).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(document.documentElement.dataset.themeColor).toBe('verde'));
    await waitFor(() => expect(ngo().preferences.theme_color).toBe('VERDE'));
    await user.click(screen.getByRole('button', { name: 'Escuro' }));
    await waitFor(() => expect(ngo().preferences.theme_mode).toBe('DARK'));
    // ONG não tem a opção de mostrar doações.
    expect(screen.queryByText('Mostrar minhas doações concluídas na minha página')).not.toBeInTheDocument();
  });

  it('se a API recusar, a cor volta e aparece o aviso', async () => {
    server.use(
      http.patch(apiUrl('/profile/preferences'), () =>
        HttpResponse.json({ error: 'X', message: 'x' }, { status: 500 }),
      ),
    );
    const { user } = renderApp('/settings', { loggedAs: IDS.donor });
    await user.click(await screen.findByRole('radio', { name: 'Rosa' }));
    expect(await screen.findByText('Não deu para salvar a preferência. Tente de novo.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('doador: mostrar doações; som e aviso de mensagem ficam neste navegador', async () => {
    const { user } = renderApp('/settings', { loggedAs: IDS.donor });
    await user.click(await screen.findByRole('switch', { name: /Mostrar minhas doações/ }));
    await waitFor(() => expect(db.state.users.get(IDS.donor)!.user.preferences.show_donations).toBe(false));
    await user.click(screen.getByRole('switch', { name: 'Som de mensagem nova' }));
    expect(localStorage.getItem('cd:chat-sound')).toBe('false');
    await user.click(screen.getByRole('switch', { name: 'Aviso de mensagem nova na tela' }));
    expect(localStorage.getItem('cd:chat-notify')).toBe('false');
    expect(screen.getByRole('link', { name: 'Ver minha página' })).toHaveAttribute('href', `/u/${IDS.donor}`);
  });
});
