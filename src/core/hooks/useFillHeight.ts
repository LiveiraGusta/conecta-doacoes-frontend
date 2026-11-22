import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Altura do elemento = o que sobra da janela abaixo dele, menos `bottom` (barra de baixo do celular).
 * Mede de verdade, então banners (offline, ONG em análise) e o header alto do desktop entram na conta.
 * Devolve um callback ref: funciona também quando o elemento aparece depois (lista → sala no celular).
 */
export function useFillHeight<T extends HTMLElement>(bottom = 0, min = 320) {
  const node = useRef<T | null>(null);
  const [attached, setAttached] = useState(0);
  const ref = useCallback((el: T | null) => {
    node.current = el;
    setAttached((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    if (!node.current) return;
    const update = () => {
      const el = node.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(min, window.innerHeight - top - bottom)}px`;
    };
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [attached, bottom, min]);

  return ref;
}
