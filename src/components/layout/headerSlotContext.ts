import { createContext } from 'react';

/**
 * Espaço no header do desktop que a página pode ocupar (a busca do feed, como no design).
 * O shell guarda o elemento por callback ref (sem `id` nem `getElementById` durante o render):
 * - `undefined`: o shell não tem esse espaço (mobile);
 * - `null`: tem, mas o elemento ainda não montou (primeiro render);
 * - elemento: pronto.
 */
export const HeaderSlotContext = createContext<HTMLElement | null | undefined>(undefined);
