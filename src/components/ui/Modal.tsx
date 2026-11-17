import CloseRounded from '@mui/icons-material/CloseRounded';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import { useId, type ReactNode } from 'react';
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

const SIZES: Record<ModalSize, DialogProps['maxWidth']> = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' };

/**
 * Modal do app: Dialog do MUI no desktop e bottom-sheet (Drawer de baixo) no mobile.
 * O MUI cuida do foco preso e devolvido, do Esc, do fundo e da rolagem travada.
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
  const titleId = useId();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const asSheet = sheetOnMobile && isMobile;

  const handleClose = (_event: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && !closeOnBackdrop) return;
    onClose();
  };

  const header = (
    <DialogTitle
      id={titleId}
      component="div"
      className={cn('flex items-center gap-2', hideTitle && 'absolute top-2 right-2 z-10 !p-0')}
    >
      <h2 className={cn('flex-1 text-lg font-bold', hideTitle && 'sr-only')}>{title}</h2>
      <IconButton label={t('actions.close')} onClick={onClose}>
        <CloseRounded fontSize="inherit" />
      </IconButton>
    </DialogTitle>
  );
  const body = (
    <>
      {header}
      <DialogContent>{children}</DialogContent>
      {footer && <DialogActions className="flex-wrap gap-2 border-t border-border px-5 py-3">{footer}</DialogActions>}
    </>
  );

  if (asSheet) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': titleId,
            className: cn('max-h-[95dvh] rounded-t-3xl', className),
          } as object,
        }}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={SIZES[size]}
      fullWidth
      aria-labelledby={titleId}
      className={className}
    >
      {body}
    </Dialog>
  );
}
