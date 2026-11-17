import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/api/http';
import type * as AuthService from '@/core/services/auth';
import { db, IDS } from '@/mocks/db';
import { currentUrl, renderApp } from '@/test/render';

/*
 * O envio multipart com File não passa pelo fetch do jsdom (ver src/test/setup.ts). Aqui o serviço é
 * substituído e o teste confere o que o formulário entrega a ele; o multipart em si é testado em
 * core/services/auth.test.ts (ambiente node).
 */
const registerNgo = vi.fn();
vi.mock('@/core/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthService>()),
  registerNgo: (...args: unknown[]) => registerNgo(...args),
}));

const pdf = () => new File(['%PDF-1.4'], 'cartao-cnpj.pdf', { type: 'application/pdf' });

async function fillNgo(user: ReturnType<typeof renderApp>['user']) {
  await user.type(await screen.findByLabelText('Nome da ONG'), 'ONG Nova');
  await user.type(screen.getByLabelText('CNPJ'), '11222333000181');
  await user.type(screen.getByLabelText('E-mail'), 'nova@ong.org');
  await user.type(screen.getByLabelText('Senha'), 'Senha123');
  await user.selectOptions(screen.getByLabelText('UF'), 'RJ');
  await user.type(screen.getByRole('combobox', { name: 'Cidade' }), 'niteroi');
}

describe('RegisterPage — ONG', () => {
  beforeEach(() => {
    // Sem chaves, o mock devolvido viraria uma rotina de limpeza que o Vitest chama sem argumentos.
    registerNgo.mockReset();
  });

  it('CNPJ com máscara, documento obrigatório e cadastro leva à tela "Cadastro recebido"', async () => {
    registerNgo.mockImplementation(async (input: { name: string }) => {
      const user = { ...db.state.users.get(IDS.ngoPending)!.user, name: input.name };
      db.loginAs(IDS.ngoPending);
      return user;
    });
    const { user, router } = renderApp('/register?tipo=ong');
    await fillNgo(user);
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81');

    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    expect(await screen.findByText('Envie o documento da ONG (cartão CNPJ)')).toBeInTheDocument();
    expect(registerNgo).not.toHaveBeenCalled();

    await user.upload(screen.getByLabelText('Documento da ONG'), pdf());
    expect(screen.getByTestId('arquivo-nome')).toHaveTextContent('cartao-cnpj.pdf');
    expect(screen.queryByText('Envie o documento da ONG (cartão CNPJ)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/bem-vindo-ong'));
    expect(registerNgo).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ONG Nova',
        cnpj: '11.222.333/0001-81',
        city: 'Niterói',
        state: 'RJ',
        website: undefined,
        document: expect.objectContaining({ name: 'cartao-cnpj.pdf' }),
      }),
      expect.anything(),
    );
    expect(await screen.findByRole('heading', { name: 'Cadastro recebido!' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ver o feed' }));
    expect(await screen.findByText('Seu cadastro está em análise.')).toBeInTheDocument();
  });

  it('documento de tipo errado é recusado no cliente; dá para remover e trocar', async () => {
    const { user } = renderApp('/register?tipo=ong');
    await screen.findByLabelText('Nome da ONG');
    const docx = new File(['x'], 'cnpj.docx', { type: 'application/msword' });
    // O seletor do navegador filtra pelo `accept`, mas dá para burlar ("Todos os arquivos" ou arrastar):
    // o evento de change direto simula isso.
    fireEvent.change(screen.getByLabelText('Documento da ONG'), { target: { files: [docx] } });
    expect(await screen.findByText('Envie um PDF, JPG, PNG ou WEBP')).toBeInTheDocument();
    expect(screen.getByTestId('arquivo-nome')).toHaveTextContent('cnpj.docx');
    await user.click(screen.getByRole('button', { name: 'Remover arquivo' }));
    expect(screen.queryByTestId('arquivo-nome')).not.toBeInTheDocument();
  });

  it('erros da API vão para os campos: CNPJ já cadastrado e documento inválido', async () => {
    const { user } = renderApp('/register?tipo=ong');
    await fillNgo(user);
    await user.upload(screen.getByLabelText('Documento da ONG'), pdf());

    registerNgo.mockRejectedValueOnce(new ApiError(409, 'CNPJ_TAKEN', 'Já existe uma ONG com este CNPJ.'));
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    expect(await screen.findByText('Já existe uma ONG com este CNPJ.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true');

    registerNgo.mockRejectedValueOnce(
      new ApiError(400, 'INVALID_DOCUMENT', 'Envie 1 documento em PDF, JPG, PNG ou WEBP de até 5 MB.'),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    expect(await screen.findByText('Envie 1 documento em PDF, JPG, PNG ou WEBP de até 5 MB.')).toBeInTheDocument();
  });

  it('CNPJ com dígito errado é recusado antes de enviar', async () => {
    const { user } = renderApp('/register?tipo=ong');
    await user.type(await screen.findByLabelText('CNPJ'), '11222333000180');
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    expect(await screen.findByText('CNPJ inválido. Confira os 14 dígitos')).toBeInTheDocument();
  });
});
