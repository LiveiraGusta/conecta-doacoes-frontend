import { z } from 'zod';
import { fileProblem, IMAGE_TYPES } from '../utils/files';

/** Fotos exigidas pela API (exatamente 3; a 1ª é a capa). */
export const PHOTO_COUNT = 3;

/**
 * Uma foto do formulário: o arquivo pronto (cortado no editor) e o original, para editar de novo
 * sem perder qualidade. `id` estável para a lista arrastável.
 */
export interface PhotoSlot {
  id: string;
  file: File;
  original: File;
}

const CATEGORY_VALUES = ['ROUPAS', 'ALIMENTOS', 'BRINQUEDOS', 'LIVROS'] as const;

/** Publicar doação (guia, F6), com as mesmas regras da API. Mensagens são chaves de `validation`. */
export const newItemSchema = z.object({
  photos: z
    .array(z.custom<PhotoSlot>())
    .refine((p) => p.length === PHOTO_COUNT, 'validation:photos.count')
    .refine((p) => p.every((s) => fileProblem(s.file, IMAGE_TYPES) !== 'type'), 'validation:photos.type')
    .refine((p) => p.every((s) => fileProblem(s.file, IMAGE_TYPES) !== 'size'), 'validation:fileSize'),
  title: z.string().trim().min(3, 'validation:item.title').max(255, 'validation:item.title'),
  category: z.enum(CATEGORY_VALUES, { error: 'validation:item.category' }),
  description: z.string().trim().max(2000, 'validation:item.description'),
  notes: z.string().trim().max(1000, 'validation:item.notes'),
});

export type NewItemValues = z.infer<typeof newItemSchema>;
