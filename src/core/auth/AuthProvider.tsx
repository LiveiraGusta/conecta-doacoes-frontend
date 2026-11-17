import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { setUnauthorizedHandler } from '../api/http';
import { fetchMe, logout as logoutRequest, ME_KEY } from '../services/auth';
import { useTheme } from '../theme/useTheme';
import type { User } from '../types/api';
import { useSnackbar } from '../feedback/useSnackbar';
import { AuthContext, type AuthContextValue } from './useAuth';

/**
 * Sessão do app (guia, F1). O estado é a query `['me']` (GET /auth/me): o cookie é httpOnly, então o JS
 * nunca vê o token. Responsabilidades:
 * - 401 no boot = visitante (não é erro);
 * - 401 depois, numa rota fechada = sessão expirada: limpa o cache, avisa e manda para o login com `?redirect=`;
 * - ONG refaz o /auth/me ao focar a aba (é assim que descobre aprovação ou rejeição);
 * - aplica as preferências de tema que vêm em `user.preferences`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const { setTheme } = useTheme();

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    staleTime: 60_000,
    refetchOnWindowFocus: (query) => (query.state.data as User | null | undefined)?.role === 'NGO',
  });

  const [afterLogin, setAfterLogin] = useState<string | null>(null);
  const setUser = useCallback(
    (user: User | null, redirectTo?: string) => {
      setAfterLogin(user ? (redirectTo ?? null) : null);
      queryClient.setQueryData(ME_KEY, user);
    },
    [queryClient],
  );
  const clearAfterLogin = useCallback(() => setAfterLogin(null), []);

  // O handler de 401 vive fora do React (no cliente HTTP): lê a rota atual por ref.
  const pathRef = useRef(location.pathname + location.search);
  useEffect(() => {
    pathRef.current = location.pathname + location.search;
  }, [location.pathname, location.search]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!queryClient.getQueryData(ME_KEY)) return; // já era visitante: quem chamou trata
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
      queryClient.setQueryData(ME_KEY, null);
      snackbar.show({ message: t('session.expired'), variant: 'info' });
      navigate(`/login?redirect=${encodeURIComponent(pathRef.current)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, navigate, snackbar, t]);

  const prefs = me.data?.preferences;
  useEffect(() => {
    if (prefs) setTheme({ color: prefs.theme_color, mode: prefs.theme_mode });
  }, [prefs, setTheme]);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {}); // sem rede: o cookie expira sozinho; o app sai mesmo assim
    queryClient.clear();
    setAfterLogin(null);
    queryClient.setQueryData(ME_KEY, null);
    navigate('/feed', { replace: true });
  }, [queryClient, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: me.isPending ? 'loading' : me.data ? 'authenticated' : 'visitor',
      user: me.data ?? null,
      setUser,
      afterLogin,
      clearAfterLogin,
      logout,
    }),
    [me.isPending, me.data, setUser, afterLogin, clearAfterLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
