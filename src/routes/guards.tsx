import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { homeFor, useAuth } from '@/core/auth/useAuth';
import type { Role } from '@/core/types/api';
import { safeRedirect } from '@/core/utils/redirect';
import { ForbiddenPage } from '@/pages/system/SystemPages';

/** Enquanto o /auth/me responde: esqueleto do conteúdo (nunca tela branca). */
export function PageLoader() {
  const { t } = useTranslation();
  return (
    <LoadingRegion label={t('system.loading')} className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Rota que exige login: visitante vai para o login e volta para cá depois (`?redirect=`). */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'visitor') {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}

/** Perfil errado para a rota: tela 403 (dentro do shell). Use dentro de <RequireAuth>. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}

/**
 * Login e cadastro: quem já está logado vai embora daqui. Destino, nesta ordem: o escolhido por quem acabou
 * de logar (`afterLogin`, ex.: boas-vindas da ONG), o `?redirect=` interno, o início do perfil.
 * Usar o mesmo destino de quem logou evita a corrida entre a navegação (lazy, em transition) e o usuário gravado.
 */
export function PublicOnly() {
  const { status, user, afterLogin } = useAuth();
  const [params] = useSearchParams();
  if (status === 'loading') return <PageLoader />;
  if (user) return <Navigate to={afterLogin ?? safeRedirect(params.get('redirect')) ?? homeFor(user.role)} replace />;
  return <Outlet />;
}

/** "/" → início de cada perfil (visitante e doador/ONG: feed; Admin: moderação). */
export function HomeRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <PageLoader />;
  return <Navigate to={homeFor(user?.role)} replace />;
}
