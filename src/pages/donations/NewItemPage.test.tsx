import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/api/http';
import type * as ItemsService from '@/core/services/items';
import type * as ImageUtils from '@/core/utils/image';
import { db, IDS } from '@/mocks/db';
import { makeItem } from '@/mocks/items';
import { currentUrl, renderApp } from '@/test/render';

/*
 * O jsdom não desenha em <canvas> nem carrega imagens: o recorte vira "devolve o mesmo arquivo em WEBP"
 * e o Cropper vira uma caixa que informa a área na hora. O multipart com File também não passa pelo fetch
 * do jsdom (ver src/test/setup.ts): o envio é substituído e testado em mocks/handlers/donations.test.ts.
 */
vi.mock('react-easy-crop', () => ({
  default: function FakeCropper({ onCropComplete }: { onCropComplete?(a: object, p: object): void }) {
    // Uma vez só, como o Cropper real ao carregar a imagem (o callback muda a cada render).
    const report = useRef(onCropComplete);
    useEffect(
      () => report.current?.({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 400, height: 300 }),
      [],
    );
    return <div data-testid="cropper" />;
  },
}));
const renderCroppedImage = vi.fn();
vi.mock('@/core/utils/image', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageUtils>()),
  renderCroppedImage: (...args: unknown[]) => renderCroppedImage(...args),
}));
const createItem = vi.fn();
vi.mock('@/core/services/items', async (importOriginal) => ({
  ...(await importOriginal<typeof ItemsService>()),
  createItem: (...args: unknown[]) => createItem(...args),
}));

const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

type User = ReturnType<typeof renderApp>['user'];

/** Escolhe as fotos e aplica o editor em cada uma. */
async function addPhotos(user: User, names: string[]) {
  await user.upload(screen.getByTestId('photo-input'), names.map(jpg));
  for (let i = 0; i < names.length; i++) {
    const editor = await screen.findByRole('dialog', { name: 'Editar foto' });
    const apply = within(editor).getByRole('button', { name: 'Aplicar' });
    await waitFor(() => expect(apply).toBeEnabled());
    await user.click(apply);
  }
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar foto' })).not.toBeInTheDocument());
}

const photoNames = () =>
  (createItem.mock.calls.at(-1)?.[0] as { photos: File[] } | undefined)?.photos.map((p) => p.name);

describe('Nova doação', () => {
  beforeEach(() => {
    renderCroppedImage.mockReset();
    renderCroppedImage.mockImplementation(
      async (file: File) => new File([file], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }),
    );
    createItem.mockReset();
  });

  it('3 etapas: fotos (editor + capa), dados com validação, revisão e publicar volta para a lista', async () => {
    createItem.mockImplementation(async (input: { title: string }) => {
      const item = makeItem({
        donor_id: IDS.donor,
        title: input.title,
        description: null,
        notes: null,
        category: 'ROUPAS',
        city: 'São Paulo',
        state: 'SP',
        status: 'DISPONIVEL',
        selected_ngo_id: null,
        hoursAgo: 0,
      });
      db.state.items.set(item.id, item);
      return item;
    });
    const { user, router } = renderApp('/donations/new', { loggedAs: IDS.donor });
    expect(await screen.findByRole('heading', { name: 'Fotos do item' })).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 3')).toBeInTheDocument();

    // Sem as 3 fotos não avança.
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(await screen.findByText('Adicione exatamente 3 fotos')).toBeInTheDocument();

    await addPhotos(user, ['a.jpg', 'b.jpg', 'c.jpg']);
    expect(renderCroppedImage).toHaveBeenCalledTimes(3);
    expect(renderCroppedImage).toHaveBeenCalledWith(
      expect.any(File),
      { x: 0, y: 0, width: 400, height: 300 },
      {
        rotation: 0,
        flipH: false,
        flipV: false,
      },
    );
    expect(screen.queryByText('Adicione exatamente 3 fotos')).not.toBeInTheDocument();
    expect(screen.queryByText(/Adicionar fotos/)).not.toBeInTheDocument();

    // A 3ª vira capa; as setas trocam a ordem.
    await user.click(screen.getByRole('button', { name: 'Usar foto 3 como capa' }));
    expect(await screen.findByText('Foto movida para a posição 1.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mover foto 2 para a direita' }));

    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(await screen.findByRole('heading', { name: 'Sobre o item' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(await screen.findByText('Informe um título de 3 a 255 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Escolha a categoria')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título'), 'Casaco de lã');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'ROUPAS');
    await user.type(screen.getByLabelText('Descrição'), 'Tamanho M');
    expect(screen.getByText(/9\/2000/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próximo' }));

    expect(await screen.findByRole('heading', { name: 'Confira antes de publicar' })).toBeInTheDocument();
    expect(screen.getByText('Casaco de lã')).toBeInTheDocument();
    expect(screen.getByText('Será publicada em São Paulo - SP, a sua cidade.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto 1 de 3: Casaco de lã' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publicar doação' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/donations'));
    expect(createItem.mock.calls[0]?.[0]).toMatchObject({
      title: 'Casaco de lã',
      category: 'ROUPAS',
      description: 'Tamanho M',
      notes: undefined,
    });
    expect(photoNames()).toEqual(['c.webp', 'b.webp', 'a.webp']);
    expect(await screen.findByText('Doação publicada! As ONGs de São Paulo já podem ver.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ver detalhes de Casaco de lã' })).toBeInTheDocument();
  });

  it('editar de novo, remover, arquivo recusado e cancelar o editor', async () => {
    const { user } = renderApp('/donations/new', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Fotos do item' });

    // O `accept` do input já filtra no navegador; arrastar um GIF chega aqui do mesmo jeito.
    await userEvent
      .setup({ applyAccept: false })
      .upload(screen.getByTestId('photo-input'), new File(['x'], 'anim.gif', { type: 'image/gif' }));
    expect(await screen.findByText('"anim.gif" não é JPG, PNG ou WEBP.')).toBeInTheDocument();

    await addPhotos(user, ['a.jpg']);
    expect(screen.getByText('Capa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar foto 1' }));
    const editor = await screen.findByRole('dialog', { name: 'Editar foto' });
    await user.click(within(editor).getByRole('button', { name: 'Girar 90°' }));
    await user.click(within(editor).getByRole('button', { name: 'Espelhar na horizontal' }));
    await user.click(within(editor).getByRole('button', { name: 'Aplicar' }));
    await waitFor(() =>
      expect(renderCroppedImage).toHaveBeenLastCalledWith(expect.any(File), expect.anything(), {
        rotation: 90,
        flipH: true,
        flipV: false,
      }),
    );

    // Cancelar o editor de uma foto nova não a adiciona.
    await user.upload(screen.getByTestId('photo-input'), [jpg('b.jpg')]);
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Editar foto' })).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar foto' })).not.toBeInTheDocument());
    expect(screen.getByText('Adicionar fotos (1 de 3)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover foto 1' }));
    expect(screen.getByText('Adicionar fotos (0 de 3)')).toBeInTheDocument();
  });

  it('erro de campo da API volta para a etapa do campo', async () => {
    createItem.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [{ path: 'title', message: 'Título já usado' }]),
    );
    const { user } = renderApp('/donations/new', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Fotos do item' });
    await addPhotos(user, ['a.jpg', 'b.jpg', 'c.jpg']);
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    await user.type(await screen.findByLabelText('Título'), 'Casaco');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'LIVROS');
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar doação' }));
    expect(await screen.findByText('Título já usado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sobre o item' })).toBeInTheDocument();
  });

  it('sair com algo preenchido pede confirmação', async () => {
    const { user, router } = renderApp('/donations/new', { loggedAs: IDS.donor });
    await screen.findByRole('heading', { name: 'Fotos do item' });
    await addPhotos(user, ['a.jpg']);

    await user.click(await screen.findByRole('link', { name: 'Feed' }));
    const dialog = await screen.findByRole('dialog', { name: 'Descartar esta doação?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(currentUrl(router)).toBe('/donations/new');

    await user.click(await screen.findByRole('link', { name: 'Feed' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/feed'));
  });
});
