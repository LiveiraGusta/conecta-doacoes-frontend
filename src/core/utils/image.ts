/** Corte, giro e espelhamento de foto no navegador (editor da fase 4), com <canvas>. */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageTransform {
  /** Graus (o editor gira de 90 em 90). */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

/** Maior lado da foto final: suficiente para o card e o detalhe, e bem abaixo dos 5 MB. */
export const MAX_PHOTO_SIDE = 1600;
const QUALITY = 0.9;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Tamanho da caixa que contém a imagem girada. */
export function rotatedSize(width: number, height: number, rotation: number) {
  const r = toRadians(rotation);
  return {
    width: Math.round(Math.abs(Math.cos(r) * width) + Math.abs(Math.sin(r) * height)),
    height: Math.round(Math.abs(Math.sin(r) * width) + Math.abs(Math.cos(r) * height)),
  };
}

/** Reduz para caber em `max` no maior lado, mantendo a proporção (nunca aumenta). */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "minha foto.HEIC.jpg" → "minha foto.HEIC.webp". */
export const renameExtension = (name: string, ext: string) => `${name.replace(/\.[a-z0-9]+$/i, '') || 'foto'}.${ext}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Desenha a imagem girada e espelhada numa tela do tamanho da caixa girada (o mesmo espaço em que o
 * react-easy-crop mede o corte), recorta a área escolhida, reduz para {@link MAX_PHOTO_SIDE} e exporta
 * WEBP (JPEG se o navegador não gerar WEBP).
 */
export async function renderCroppedImage(source: File, area: CropArea, t: ImageTransform): Promise<File> {
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const box = rotatedSize(img.naturalWidth, img.naturalHeight, t.rotation);

    const full = document.createElement('canvas');
    full.width = box.width;
    full.height = box.height;
    const fctx = full.getContext('2d');
    if (!fctx) throw new Error('Canvas indisponível.');
    fctx.translate(box.width / 2, box.height / 2);
    fctx.rotate(toRadians(t.rotation));
    fctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1);
    fctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
    fctx.drawImage(img, 0, 0);

    const out = fitWithin(area.width, area.height);
    const canvas = document.createElement('canvas');
    canvas.width = out.width;
    canvas.height = out.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(full, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

    let blob = await toBlob(canvas, 'image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg');
    if (!blob) throw new Error('Não foi possível gerar a foto.');
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], renameExtension(source.name, ext), { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
