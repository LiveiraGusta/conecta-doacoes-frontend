import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Illustration } from '@/components/ui/Illustration';
import { useAuth } from '@/core/auth/useAuth';

/** Logo depois do cadastro da ONG (decisão da fase 2): explica a análise e leva ao feed. */
export default function NgoWelcomePage() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <section className="flex max-w-lg flex-col items-center gap-4 rounded-3xl bg-surface p-8 text-center shadow-sm">
        <Illustration name="waiting" className="max-w-64" />
        <h1 className="text-2xl font-bold">{t('ngoWelcome.title')}</h1>
        <p className="text-fg-muted">{t('ngoWelcome.description', { name: user?.name ?? '' })}</p>
        <p className="text-sm text-fg-muted">{t('ngoWelcome.next')}</p>
        <Link
          to="/feed"
          className="mt-2 inline-flex h-12 items-center rounded-full bg-primary px-8 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {t('ngoWelcome.cta')}
        </Link>
      </section>
    </main>
  );
}
