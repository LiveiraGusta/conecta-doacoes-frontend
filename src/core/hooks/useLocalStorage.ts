import { useCallback, useState } from 'react';

/**
 * Estado que persiste no localStorage (só conveniências do aparelho, ex.: sidebar recolhida).
 * Storage bloqueado (modo privado) não quebra: o valor só não persiste.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // sem storage: segue só em memória
      }
    },
    [key],
  );

  return [value, set];
}
