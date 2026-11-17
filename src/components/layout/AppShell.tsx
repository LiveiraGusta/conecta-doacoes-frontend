import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet } from 'react-router';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { AppShellDesktop } from './AppShell.desktop';
import { AppShellMobile } from './AppShell.mobile';
import { HeaderSlotContext } from './headerSlotContext';

/**
 * Casca das páginas logadas e de visitante. Desktop e mobile são componentes separados
 * (decisão do plano: as telas do design são bem diferentes), escolhidos pelo breakpoint `md`.
 *
 * A página fica montada uma vez só, num portal para um `div` fixo que cada casca encaixa no seu `<main>`:
 * redimensionar a janela ou girar o tablet troca a casca sem perder o que a página tinha
 * (ex.: fotos e dados da nova doação).
 */
export function AppShell() {
  const isMobile = useIsMobile();
  const [content] = useState(() => {
    const el = document.createElement('div');
    el.style.display = 'contents';
    return el;
  });
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <>
      {isMobile ? <AppShellMobile content={content} /> : <AppShellDesktop content={content} headerSlotRef={setSlot} />}
      {createPortal(
        <HeaderSlotContext.Provider value={isMobile ? undefined : slot}>
          <Outlet />
        </HeaderSlotContext.Provider>,
        content,
      )}
    </>
  );
}
