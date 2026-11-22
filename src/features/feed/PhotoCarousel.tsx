import ImageNotSupportedRounded from '@mui/icons-material/ImageNotSupportedRounded';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';

/**
 * Fotos do item (decisão da fase 3): rolagem lateral com snap (arrastar no celular, trackpad no desktop)
 * e bolinhas clicáveis como no design. A 1ª foto é a capa; as outras carregam sob demanda.
 */
export function PhotoCarousel({
  photos,
  title,
  className,
  onOpen,
}: {
  photos: string[];
  title: string;
  /** Altura/proporção vem daqui (ex.: `aspect-[4/3]`). */
  className?: string;
  /** Clique na foto (o card abre o detalhe). */
  onOpen?(): void;
}) {
  const { t } = useTranslation('feed');
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-1 bg-surface-alt text-fg-muted', className)}>
        <ImageNotSupportedRounded aria-hidden />
        <span className="text-sm">{t('card.noPhoto')}</span>
      </div>
    );
  }

  const goTo = (i: number) => {
    setIndex(i);
    const el = track.current;
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative overflow-hidden bg-surface-alt', className)}>
      <div
        ref={track}
        className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={t('card.photo', { n: i + 1, total: photos.length, title })}
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
            onClick={onOpen}
            className={cn('size-full shrink-0 snap-center object-cover', onOpen && 'cursor-pointer')}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={t('card.photoGo', { n: i + 1 })}
              aria-current={i === index || undefined}
              onClick={() => goTo(i)}
              className={cn(
                // Branco sobre qualquer foto; a atual vira uma pílula (não depende da cor da foto).
                'h-2.5 rounded-full bg-white shadow ring-1 ring-black/20 transition-all',
                i === index ? 'w-6' : 'w-2.5 opacity-60 hover:opacity-100',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
