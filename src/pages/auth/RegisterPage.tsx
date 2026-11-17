import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { cn } from '@/core/utils/cn';
import { RegisterDonorForm } from '@/features/auth/RegisterDonorForm';
import { RegisterNgoForm } from '@/features/auth/RegisterNgoForm';

type Kind = 'doador' | 'ong';

/**
 * Cadastro: formulário à esquerda e a ilustração à direita (o inverso do login).
 * Abas "Quero doar" / "Sou uma ONG" no `?tipo=` (dá para mandar o link direto para ONGs).
 */
export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const [params, setParams] = useSearchParams();
  const kind: Kind = params.get('tipo') === 'ong' ? 'ong' : 'doador';
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (next: Kind) =>
    setParams(
      (p) => {
        p.set('tipo', next);
        return p;
      },
      { replace: true },
    );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next: Kind = kind === 'doador' ? 'ong' : 'doador';
    select(next);
    tabs.current[next === 'doador' ? 0 : 1]?.focus();
  };

  const redirect = params.get('redirect');
  const tab = (value: Kind, label: string, index: number) => (
    <button
      ref={(el) => {
        tabs.current[index] = el;
      }}
      type="button"
      role="tab"
      id={`aba-${value}`}
      aria-selected={kind === value}
      aria-controls={`painel-${value}`}
      tabIndex={kind === value ? 0 : -1}
      onClick={() => select(value)}
      onKeyDown={onKeyDown}
      className={cn(
        'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        kind === value ? 'bg-primary text-on-primary' : 'text-fg-muted hover:bg-surface-alt',
      )}
    >
      {label}
    </button>
  );

  return (
    <AuthSplitLayout
      formSide="left"
      illustration="register"
      title={t('register.title')}
      subtitle={kind === 'ong' ? t('register.ngoIntro') : t('register.donorIntro')}
      footer={
        <>
          {t('register.hasAccount')}{' '}
          <Link
            to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
            className="font-semibold text-primary-text hover:underline"
          >
            {t('register.login')}
          </Link>
        </>
      }
    >
      <div role="tablist" aria-label={t('register.tabsLabel')} className="flex gap-1 rounded-full bg-surface-alt p-1">
        {tab('doador', t('register.donorTab'), 0)}
        {tab('ong', t('register.ngoTab'), 1)}
      </div>
      <div role="tabpanel" id={`painel-${kind}`} aria-labelledby={`aba-${kind}`}>
        {/* key: trocar de aba começa um formulário limpo */}
        {kind === 'ong' ? <RegisterNgoForm key="ong" /> : <RegisterDonorForm key="doador" />}
      </div>
    </AuthSplitLayout>
  );
}
