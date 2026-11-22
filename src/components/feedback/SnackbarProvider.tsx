import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import MuiButton from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SnackbarContext, type SnackbarApi, type SnackbarOptions } from '@/core/feedback/useSnackbar';

interface Entry extends SnackbarOptions {
  id: number;
}

const ICONS = { info: InfoRounded, success: CheckCircleRounded, error: ErrorRounded } as const;
const ICON_COLOR = { info: 'inherit', success: 'success.light', error: 'error.light' } as const;

/**
 * Snackbar do MUI no estilo mat-snackbar: fila, um por vez, some em 4 s (pausa com o mouse em cima),
 * ação opcional ("Desfazer"). Na base, centralizado; no mobile, acima da BottomNav.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Entry[]>([]);
  const nextId = useRef(1);
  const { t } = useTranslation();

  const show = useCallback((options: SnackbarOptions) => {
    const id = nextId.current++;
    setQueue((q) => [...q, { ...options, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id?: number) => {
    setQueue((q) => (id === undefined ? q.slice(1) : q.filter((e) => e.id !== id)));
  }, []);

  const api = useMemo<SnackbarApi>(() => ({ show, dismiss }), [show, dismiss]);
  const current = queue[0];
  const variant = current?.variant ?? 'info';
  const Icon = ICONS[variant];

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <Snackbar
        // key: cada mensagem é um snackbar novo (reinicia o tempo e a animação).
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.duration ?? 4000}
        onClose={(_e, reason) => {
          if (reason !== 'clickaway' && current) dismiss(current.id);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88, md: 24 } }}
        slotProps={{ content: { 'data-variant': variant } as object }}
        message={
          current && (
            <span className="flex items-center gap-2">
              <Icon fontSize="small" sx={{ color: ICON_COLOR[variant] }} aria-hidden />
              {current.message}
            </span>
          )
        }
        action={
          current && (
            <>
              {current.action && (
                <MuiButton
                  size="small"
                  color="primary"
                  sx={{ color: 'primary.light', fontWeight: 700 }}
                  onClick={() => {
                    current.action!.onClick();
                    dismiss(current.id);
                  }}
                >
                  {current.action.label}
                </MuiButton>
              )}
              <MuiIconButton
                size="small"
                color="inherit"
                aria-label={t('actions.close')}
                onClick={() => dismiss(current.id)}
              >
                <CloseRounded fontSize="small" />
              </MuiIconButton>
            </>
          )
        }
      />
    </SnackbarContext.Provider>
  );
}
