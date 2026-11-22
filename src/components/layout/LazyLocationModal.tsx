import { lazy, Suspense, useState } from 'react';

const LocationModal = lazy(async () => ({ default: (await import('./LocationModal')).LocationModal }));

/**
 * Modal de localização carregado só na primeira vez que abre (revisão da fase 8): o formulário, o zod e a
 * lista de cidades saem do JavaScript inicial. Depois de aberto, fica montado (a animação de fechar funciona).
 */
export function LazyLocationModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  if (!opened) return null;
  return (
    <Suspense fallback={null}>
      <LocationModal open={open} onClose={onClose} />
    </Suspense>
  );
}
