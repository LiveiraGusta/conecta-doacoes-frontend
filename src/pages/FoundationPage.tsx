import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/core/api/http';
import { THEME_COLORS, THEME_MODES } from '@/core/theme/theme';
import { useTheme } from '@/core/theme/useTheme';
import type { User } from '@/core/types/api';

/**
 * Página provisória da fase 1a: mostra que tema, i18n, cliente HTTP e mocks funcionam juntos.
 * Sai na fase 1b, quando entram o AppShell e as rotas.
 */
export function FoundationPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null; // visitante
        throw err;
      }
    },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary-text">{t('appName')}</p>
        <h1 className="text-3xl font-bold">{t('foundation.title')}</h1>
        <p className="text-fg-muted">{t('foundation.subtitle')}</p>
        {import.meta.env.VITE_USE_MOCKS === 'true' && (
          <p className="mt-2 w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent">
            {t('foundation.mockMode')}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">{t('foundation.session')}</h2>
        <p className="text-fg-muted" data-testid="session-status">
          {me.isPending
            ? t('foundation.sessionLoading')
            : me.data
              ? t('foundation.sessionUser', { name: me.data.name })
              : t('foundation.sessionVisitor')}
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">{t('theme.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={theme.color === color}
                data-theme-color={color.toLowerCase()}
                onClick={() => theme.setColor(color)}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-fg"
              >
                {t(`theme.colors.${color}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">{t('theme.mode')}</legend>
          <div className="flex gap-2">
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={theme.mode === mode}
                onClick={() => theme.setMode(mode)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-text"
              >
                {t(`theme.modes.${mode}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </section>
    </main>
  );
}
