import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import type { RouteHandle } from '@/core/hooks/usePageTitle';
import { ErrorPage, NotFoundPage } from '@/pages/system/SystemPages';
import { HomeRedirect, PageLoader, PublicOnly, RequireAuth, RequireRole } from './guards';
import { RootLayout } from './RootLayout';

const title = (titleKey: string): RouteHandle => ({ titleKey });

/** Página carregada sob demanda (bundle inicial menor). */
const page = (load: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

const feed = page(() => import('@/pages/feed/FeedPage'));
const item = page(() => import('@/pages/feed/ItemPage'));
const userPage = page(() => import('@/pages/users/UserPage'));
const donations = page(() => import('@/pages/donations/DonationsPage'));
const newItem = page(() => import('@/pages/donations/NewItemPage'));
const interests = page(() => import('@/pages/donations/InterestsPage'));
const chats = page(() => import('@/pages/chats/ChatsPage'));
const profile = page(() => import('@/pages/profile/ProfilePage'));
const settings = page(() => import('@/pages/settings/SettingsPage'));
const adminNgos = page(() => import('@/pages/admin/AdminNgosPage'));
const adminReports = page(() => import('@/pages/admin/AdminReportsPage'));
const adminReport = page(() => import('@/pages/admin/AdminReportPage'));
const loginPage = page(() => import('@/pages/auth/LoginPage'));
const registerPage = page(() => import('@/pages/auth/RegisterPage'));
const forgotPage = page(async () => ({ default: (await import('@/pages/auth/PasswordPages')).ForgotPasswordPage }));
const resetPage = page(async () => ({ default: (await import('@/pages/auth/PasswordPages')).ResetPasswordPage }));
const ngoWelcome = page(() => import('@/pages/auth/NgoWelcomePage'));

/**
 * Rotas do app (plano, "Rotas"). Visitante vê feed, detalhe e página pessoal; o resto exige login,
 * e cada área exige o perfil certo (403 dentro do shell).
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', handle: title('pages.login'), ...loginPage },
          { path: '/register', handle: title('pages.register'), ...registerPage },
          { path: '/forgot-password', handle: title('pages.forgotPassword'), ...forgotPage },
        ],
      },
      // O link do e-mail funciona logado ou não.
      { path: '/redefinir-senha', handle: title('pages.resetPassword'), ...resetPage },
      // Logo depois do cadastro da ONG: fora do shell, só para ONG logada.
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole roles={['NGO']} />,
            children: [{ path: '/bem-vindo-ong', handle: title('pages.ngoWelcome'), ...ngoWelcome }],
          },
        ],
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'feed', handle: title('pages.feed'), ...feed },
          { path: 'items/:itemId', handle: title('pages.item'), ...item },
          { path: 'u/:userId', handle: title('pages.userPage'), ...userPage },
          {
            element: <RequireAuth />,
            children: [
              { path: 'settings', handle: title('pages.settings'), ...settings },
              {
                element: <RequireRole roles={['DONOR', 'NGO']} />,
                children: [
                  { path: 'donations', handle: title('pages.donations'), ...donations },
                  // Sala aninhada: no desktop a lista fica montada ao trocar de conversa.
                  {
                    path: 'chats',
                    handle: title('pages.chats'),
                    ...chats,
                    children: [{ index: true }, { path: ':itemId', handle: title('pages.chat') }],
                  },
                  { path: 'profile', handle: title('pages.profile'), ...profile },
                ],
              },
              {
                element: <RequireRole roles={['DONOR']} />,
                children: [
                  { path: 'donations/new', handle: title('pages.newDonation'), ...newItem },
                  { path: 'donations/:itemId/interests', handle: title('pages.interests'), ...interests },
                ],
              },
              {
                element: <RequireRole roles={['ADMIN']} />,
                children: [
                  { path: 'admin/ngos', handle: title('pages.adminNgos'), ...adminNgos },
                  { path: 'admin/reports', handle: title('pages.adminReports'), ...adminReports },
                  { path: 'admin/reports/:reportId', handle: title('pages.adminReport'), ...adminReport },
                ],
              },
            ],
          },
          { path: '*', handle: title('pages.notFound'), element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
