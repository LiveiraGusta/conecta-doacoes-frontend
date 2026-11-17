import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/core/api/http';
import { homeFor, useAuth } from '@/core/auth/useAuth';

const linkButton =
  'inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover';

/** 404: rota que não existe, ou ITEM_NOT_FOUND/USER_NOT_FOUND numa página de detalhe. */
export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <EmptyState
      illustration="notFound"
      title={t('system.notFoundTitle')}
      description={t('system.notFoundDescription')}
      action={
        <>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {t('actions.back')}
          </Button>
          <Link to={homeFor(user?.role)} className={linkButton}>
            {t('actions.goHome')}
          </Link>
        </>
      }
    />
  );
}

/** 403: perfil errado para a rota (guard) ou FORBIDDEN numa página. */
export function ForbiddenPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <EmptyState
      illustration="forbidden"
      title={t('system.forbiddenTitle')}
      description={t('system.forbiddenDescription')}
      action={
        <Link to={homeFor(user?.role)} className={linkButton}>
          {t('actions.goHome')}
        </Link>
      }
    />
  );
}

/**
 * Erro inesperado (errorElement do router). Fica fora dos providers de sessão:
 * não usa useAuth e volta sempre para "/". Mostra o x-request-id quando o erro veio da API.
 */
export function ErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <EmptyState
        illustration="notFound"
        title={t('system.notFoundTitle')}
        description={t('system.notFoundDescription')}
        action={
          <a href="/" className={linkButton}>
            {t('actions.goHome')}
          </a>
        }
      />
    );
  }
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg">
      <EmptyState
        illustration="error"
        title={t('system.errorTitle')}
        description={
          <>
            <p>{t('system.errorDescription')}</p>
            {requestId && (
              <p className="mt-3 font-mono text-sm select-all" data-testid="request-id">
                {t('system.requestId', { id: requestId })}
              </p>
            )}
          </>
        }
        action={
          <>
            <Button onClick={() => window.location.reload()}>{t('actions.retry')}</Button>
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold"
            >
              {t('actions.goHome')}
            </a>
          </>
        }
      />
    </main>
  );
}
