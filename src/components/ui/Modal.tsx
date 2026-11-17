import CloseRounded from '@mui/icons-material/CloseRounded';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { cn } from '@/core/utils/cn';
import { IconButton } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** Esconde o título visualmente (continua para o leitor de tela). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** No mobile, vira bottom-sheet (diálogos curtos). Padrão: true. */
  sheetOnMobile?: boolean;
  /** Clique no fundo fecha. Padrão: true (desligue em formulários longos). */
  closeOnBackdrop?: boolean;
  className?: string;
}

const SIZES: Record<ModalSize, string> = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal base (plano, "UX"): portal no body, fundo escuro, Esc e clique fora fecham,
 * foco preso dentro enquanto aberto e devolvido a quem abriu, rolagem da página travada.
 */
export function Modal({
  open,
  onClose,
  title,
  hideTitle,
  children,
  footer,
  size = 'md',
  sheetOnMobile = true,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const asSheet = sheetOnMobile && isMobile;

  // O listener de teclado vive no efeito: lê o onClose mais recente pelo ref.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () => [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    (focusables()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-40 flex bg-black/50', asSheet ? 'items-end' : 'items-center justify-center p-4')}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-full w-full flex-col overflow-hidden bg-surface text-fg shadow-2xl outline-none',
          asSheet ? 'max-h-[95dvh] rounded-t-3xl' : cn('rounded-2xl', SIZES[size]),
          className,
        )}
      >
        <header className={cn('flex items-center gap-2 px-5 pt-4', hideTitle && 'absolute top-2 right-2 z-10 p-0')}>
          <h2 id={titleId} className={cn('flex-1 text-lg font-bold', hideTitle && 'sr-only')}>
            {title}
          </h2>
          <IconButton
            label={t('actions.close')}
            onClick={onClose}
            className={cn(hideTitle && 'bg-surface/80 text-primary-text')}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
