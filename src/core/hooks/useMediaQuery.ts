import { useSyncExternalStore } from 'react';

/** Acompanha uma media query (com listener). Sem matchMedia (SSR/teste antigo) devolve false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Mesmo breakpoint do `md` do Tailwind (768 px): abaixo disso, a UI mobile (decisão do plano). */
export const MOBILE_QUERY = '(max-width: 767px)';

/** Escolhe entre os componentes `.desktop` e `.mobile`. */
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
