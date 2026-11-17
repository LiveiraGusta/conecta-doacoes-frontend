import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HeaderSlotContext } from './headerSlotContext';

/** Renderiza `children` no header quando o shell oferece o espaço (desktop); senão, no lugar (mobile). */
export function HeaderPortal({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  if (slot === undefined) return <>{children}</>;
  return slot ? createPortal(children, slot) : null;
}
