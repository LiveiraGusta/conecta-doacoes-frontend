import { useEffect, useRef } from 'react';

/** Pede a próxima página quando o fim da lista aparece (o botão "Carregar mais" fica como reserva). */
export function useInfiniteTrigger(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onVisible(), {
      rootMargin: '400px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, enabled]);
  return ref;
}
