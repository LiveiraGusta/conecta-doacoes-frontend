import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_COUNT, newItemSchema, type PhotoSlot } from '../schemas/item';
import { fitWithin, MAX_PHOTO_SIDE, renameExtension, renderCroppedImage, rotatedSize } from './image';

describe('contas do editor de foto', () => {
  it('caixa da imagem girada', () => {
    expect(rotatedSize(800, 600, 0)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 90)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(800, 600, 180)).toEqual({ width: 800, height: 600 });
  });

  it('reduz para caber no lado máximo sem aumentar', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_PHOTO_SIDE, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_PHOTO_SIDE });
    expect(fitWithin(400, 300)).toEqual({ width: 400, height: 300 });
  });

  it('troca a extensão do nome', () => {
    expect(renameExtension('praia.JPG', 'webp')).toBe('praia.webp');
    expect(renameExtension('foto.final.png', 'jpg')).toBe('foto.final.jpg');
    expect(renameExtension('sem-extensao', 'webp')).toBe('sem-extensao.webp');
  });
});

describe('renderCroppedImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Canvas falso (o jsdom não desenha): registra as chamadas e devolve um blob do tipo pedido. */
  function fakeCanvas(supportsWebp = true) {
    const calls: string[] = [];
    const ctx = {
      translate: (x: number, y: number) => calls.push(`translate(${x},${y})`),
      rotate: (r: number) => calls.push(`rotate(${Math.round((r * 180) / Math.PI)})`),
      scale: (x: number, y: number) => calls.push(`scale(${x},${y})`),
      drawImage: (...args: unknown[]) => calls.push(`drawImage(${args.length})`),
      imageSmoothingQuality: 'low',
    };
    const sizes: { width: number; height: number }[] = [];
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'canvas') return create(tag);
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (b: Blob | null) => void, type: string) =>
          cb(new Blob(['x'], { type: type === 'image/webp' && !supportsWebp ? 'image/png' : type })),
      };
      sizes.push(canvas);
      return canvas as unknown as HTMLElement;
    });
    // Imagem 800×600 que "carrega" na hora.
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 800;
        naturalHeight = 600;
        onload: (() => void) | null = null;
        set src(_: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    return { calls, sizes };
  }

  const area = { x: 10, y: 20, width: 400, height: 300 };
  const source = () => new File(['x'], 'casaco.jpg', { type: 'image/jpeg' });

  it('gira e espelha em volta do centro, recorta a área e exporta WEBP', async () => {
    const { calls, sizes } = fakeCanvas();
    const file = await renderCroppedImage(source(), area, { rotation: 90, flipH: true, flipV: false });
    expect(calls).toEqual([
      'translate(300,400)', // centro da caixa girada (600×800)
      'rotate(90)',
      'scale(-1,1)',
      'translate(-400,-300)',
      'drawImage(3)',
      'drawImage(9)', // recorte da área para a tela final
    ]);
    expect(sizes.map((s) => [s.width, s.height])).toEqual([
      [600, 800],
      [400, 300],
    ]);
    expect(file).toMatchObject({ name: 'casaco.webp', type: 'image/webp' });
  });

  it('sem WEBP no navegador, sai JPEG', async () => {
    fakeCanvas(false);
    const file = await renderCroppedImage(source(), area, { rotation: 0, flipH: false, flipV: true });
    expect(file).toMatchObject({ name: 'casaco.jpg', type: 'image/jpeg' });
  });
});

describe('newItemSchema', () => {
  const slot = (type = 'image/webp', size = 10): PhotoSlot => {
    const file = new File([new Uint8Array(size)], 'f.webp', { type });
    return { id: Math.random().toString(), file, original: file };
  };
  const base = { photos: [slot(), slot(), slot()], title: 'Casaco', category: 'ROUPAS', description: '', notes: '' };
  const messages = (v: unknown) =>
    newItemSchema.safeParse(v).error?.issues.map((i) => `${i.path.join('.')}:${i.message}`) ?? [];

  it('aceita o item completo e confere as regras da API', () => {
    expect(messages(base)).toEqual([]);
    expect(PHOTO_COUNT).toBe(3);
    expect(messages({ ...base, photos: [slot()] })).toEqual(['photos:validation:photos.count']);
    expect(messages({ ...base, photos: [slot(), slot(), slot('image/gif')] })).toEqual([
      'photos:validation:photos.type',
    ]);
    expect(messages({ ...base, photos: [slot(), slot(), slot('image/webp', 6 * 1024 * 1024)] })).toEqual([
      'photos:validation:fileSize',
    ]);
    expect(messages({ ...base, title: ' ab ', category: '', notes: 'x'.repeat(1001) })).toEqual([
      'title:validation:item.title',
      'category:validation:item.category',
      'notes:validation:item.notes',
    ]);
  });
});
