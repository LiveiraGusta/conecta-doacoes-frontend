/** Limite da API para fotos e documentos (guia, §1.5). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Foto original antes do editor: pode ser maior, porque sai recortada e comprimida (até 1600 px, WEBP).
 * O limite só evita travar o celular com arquivos enormes.
 */
export const MAX_ORIGINAL_PHOTO_BYTES = 20 * 1024 * 1024;

export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type FileProblem = 'type' | 'size' | null;

/**
 * Validação no cliente antes de enviar (a API confere de novo pelo conteúdo).
 * O tipo vem do navegador; arquivo sem tipo é aceito pela extensão.
 */
export function fileProblem(file: File, types: readonly string[], maxBytes = MAX_UPLOAD_BYTES): FileProblem {
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const type = file.type || byExtension[file.name.split('.').pop()?.toLowerCase() ?? ''] || '';
  if (!types.includes(type)) return 'type';
  if (file.size > maxBytes) return 'size';
  return null;
}

/** 1536 → "1,5 KB"; 5242880 → "5 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unit]}`;
}
