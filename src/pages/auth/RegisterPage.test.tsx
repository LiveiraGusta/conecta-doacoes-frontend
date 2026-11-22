import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db } from '@/mocks/db';
import { server } from '@/mocks/node';
import { currentUrl, renderApp } from '@/test/render';

async function fillDonor(
  user: ReturnType<typeof renderApp>['user'],
  overrides: { email?: string; city?: string } = {},
) {
  await user.type(await screen.findByLabelText('Nome completo'), 'Ana Lima');
  await user.type(screen.getByLabelText('E-mail'), overrides.email ?? 'ana@x.com');
  await user.type(screen.getByLabelText('Senha'), 'Senha123');
  await user.selectOptions(screen.getByLabelText('UF'), 'SP');
  await user.type(screen.getByRole('combobox', { name: 'Cidade' }), overrides.city ?? 'campi');
}

describe('RegisterPage — doador', () => {
  it('cidade com sugestões do IBGE; Enter escolhe; cadastro entra logado e vai para o feed', async () => {
    const { user, router } = renderApp('/register');
    await fillDonor(user);
    const list = await screen.findByRole('listbox', { name: 'Cidade' });
    expect(
      within(list)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Campinas']);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toHaveValue('Campinas');

    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
    expect(await screen.findByRole('button', { name: 'Conta de Ana Lima' })).toBeInTheDocument();
    expect(db.sessionUser()?.user).toMatchObject({ city: 'Campinas', state: 'SP', role: 'DONOR' });
  });

  it('grafia sem acento vira a oficial; cidade fora da lista é recusada no cliente', async () => {
    const { user } = renderApp('/register');
    await fillDonor(user, { city: 'sao paulo' });
    await user.click(screen.getByLabelText('Nome completo')); // sai do campo
    expect(screen.getByRole('combobox', { name: 'Cidade' })).toHaveValue('São Paulo');

    await user.clear(screen.getByRole('combobox', { name: 'Cidade' }));
    await user.type(screen.getByRole('combobox', { name: 'Cidade' }), 'Cidade Inventada');
    expect(screen.getByText('Nenhuma cidade com esse nome. Confira a grafia.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Escolha uma cidade da lista (confira a grafia e a UF)')).toBeInTheDocument();
  });

  it('IBGE fora do ar: avisa e aceita a cidade digitada', async () => {
    server.use(
      http.get(
        'https://servicodados.ibge.gov.br/api/v1/localidades/estados/:uf/municipios',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    const { user, router } = renderApp('/register');
    await fillDonor(user, { city: 'Cidade Pequena' });
    expect(
      await screen.findAllByText('Não conseguimos carregar a lista de cidades. Digite o nome completo.'),
    ).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
    expect(db.sessionUser()?.user.city).toBe('Cidade Pequena');
  });

  it('e-mail já cadastrado: erro no campo e link para entrar com ele', async () => {
    const { user } = renderApp('/register');
    await fillDonor(user, { email: 'doadora@demo.conectadoacoes.local' });
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Já existe uma conta com este e-mail.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar com este e-mail' })).toHaveAttribute(
      'href',
      '/login?email=doadora%40demo.conectadoacoes.local',
    );
  });

  it('checklist da senha marca as regras enquanto digita', async () => {
    const { user } = renderApp('/register');
    const rules = await screen.findByRole('list', { name: 'Regras da senha' });
    const ok = () =>
      within(rules)
        .getAllByRole('listitem')
        .map((li) => li.dataset.ok);
    expect(ok()).toEqual(['false', 'false', 'false']);
    await user.type(screen.getByLabelText('Senha'), 'abc1');
    expect(ok()).toEqual(['false', 'true', 'true']);
    await user.type(screen.getByLabelText('Senha'), '2345');
    expect(ok()).toEqual(['true', 'true', 'true']);
  });
});

describe('RegisterPage — abas', () => {
  it('?tipo=ong abre a aba da ONG; setas trocam de aba', async () => {
    const { user, router } = renderApp('/register?tipo=ong');
    const ngoTab = await screen.findByRole('tab', { name: 'Sou uma ONG' });
    expect(ngoTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nome da ONG')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument();

    ngoTab.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Quero doar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Quero doar' })).toHaveFocus();
    expect(currentUrl(router)).toBe('/register?tipo=doador');
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });
});
