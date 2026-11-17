import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SnackbarContext, type SnackbarApi, type SnackbarOptions } from '@/core/feedback/useSnackbar';

interface Entry extends SnackbarOptions {
  id: number;
}

const ICONS = { info: InfoRounded, success: CheckCircleRounded, error: ErrorRounded } as const;

/**
 * Snackbar no estilo do mat-snackbar: fila, um por vez, some sozinho em 4 s, ação opcional ("Desfazer").
 * Fica na base, centralizado; no mobile, acima da BottomNav. A região `aria-live` anuncia a mensagem.
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

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => dismiss(current.id), current.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  const api = useMemo<SnackbarApi>(() => ({ show, dismiss }), [show, dismiss]);
  const Icon = current ? ICONS[current.variant ?? 'info'] : null;

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
      >
        {current && Icon && (
          <div
            key={current.id}
            data-variant={current.variant ?? 'info'}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-fg px-4 py-3 text-sm text-surface shadow-lg"
          >
            <Icon
              fontSize="inherit"
              aria-hidden
              className={
                current.variant === 'error'
                  ? 'text-lg text-red-300 dark:text-red-700'
                  : current.variant === 'success'
                    ? 'text-lg text-green-300 dark:text-green-700'
                    : 'text-lg opacity-80'
              }
            />
            <span className="flex-1">{current.message}</span>
            {current.action && (
              <button
                type="button"
                className="rounded-md px-2 py-1 font-semibold text-primary-200 uppercase hover:bg-white/10 dark:text-primary-700 dark:hover:bg-black/10"
                onClick={() => {
                  current.action!.onClick();
                  dismiss(current.id);
                }}
              >
                {current.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label={t('actions.close')}
              className="rounded-md p-1 opacity-80 hover:bg-white/10"
              onClick={() => dismiss(current.id)}
            >
              <CloseRounded fontSize="inherit" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </SnackbarContext.Provider>
  );
}
