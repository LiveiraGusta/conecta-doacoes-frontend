import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation } from 'react-router';
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
    // Bloco (e não `contents`): precisa ter caixa para a animação de troca de página.
    el.style.display = 'block';
    return el;
  });

  // Troca de seção (Feed → Doações…): fade curto do conteúdo (fase 9). Dentro da mesma seção
  // (/chats → /chats/:id) não anima. Web Animations API: não remonta a página.
  const section = useLocation().pathname.split('/')[1] ?? '';
  const lastSection = useRef(section);
  useEffect(() => {
    if (lastSection.current === section) return;
    lastSection.current = section;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof content.animate !== 'function') return;
    content.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'ease-out' },
    );
  }, [section, content]);
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
