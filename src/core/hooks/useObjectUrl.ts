import { useEffect } from 'react';

interface Entry {
  url: string;
  refs: number;
}

/** Uma URL `blob:` por arquivo, compartilhada por quem mostra o mesmo arquivo (prévia, revisão, editor). */
const cache = new WeakMap<Blob, Entry>();

function entryFor(file: Blob): Entry {
  let entry = cache.get(file);
  if (!entry) {
    entry = { url: URL.createObjectURL(file), refs: 0 };
    cache.set(file, entry);
  }
  return entry;
}

function retain(file: Blob) {
  const entry = entryFor(file);
  entry.refs++;
  return () => {
    entry.refs--;
    // Libera depois: no modo Strict o React desmonta e monta de novo na hora, e a URL continua em uso.
    setTimeout(() => {
      if (entry.refs === 0 && cache.get(file) === entry) {
        URL.revokeObjectURL(entry.url);
        cache.delete(file);
      }
    }, 0);
  };
}

/**
 * URL temporária para mostrar um arquivo local (`<img src>`), liberada quando ninguém mais usa.
 * Criar no `useMemo` e liberar no cleanup quebrava a imagem no modo Strict (cleanup + nova montagem
 * com a mesma URL já liberada).
 */
export function useObjectUrl(file: Blob | null): string | null {
  useEffect(() => (file ? retain(file) : undefined), [file]);
  return file ? entryFor(file).url : null;
}

/** O mesmo para uma lista (fotos da revisão). */
export function useObjectUrls(files: Blob[]): string[] {
  useEffect(() => {
    const releases = files.map(retain);
    return () => releases.forEach((release) => release());
  }, [files]);
  return files.map((f) => entryFor(f).url);
}
