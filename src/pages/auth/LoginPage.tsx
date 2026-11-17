import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { LoginForm } from '@/features/auth/LoginForm';

const MockLoginPanel =
  import.meta.env.VITE_USE_MOCKS === 'true' ? lazy(() => import('@/features/auth/MockLoginPanel')) : null;

/** Login: 3/4 ilustração à esquerda e o formulário à direita (decisão do plano). */
export default function LoginPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  return (
    <AuthSplitLayout
      formSide="right"
      illustration="login"
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          {t('login.noAccount')}{' '}
          <Link
            to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
            className="font-semibold text-primary-text hover:underline"
          >
            {t('login.createAccount')}
          </Link>
        </>
      }
    >
      <LoginForm />
      {MockLoginPanel && (
        <Suspense fallback={null}>
          <MockLoginPanel />
        </Suspense>
      )}
    </AuthSplitLayout>
  );
}
