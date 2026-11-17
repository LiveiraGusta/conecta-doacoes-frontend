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

// Placeholders das próximas fases: cada fase troca a sua linha pela página real.
const placeholders = () => import('@/pages/ComingSoonPage');
const feed = page(() => import('@/pages/feed/FeedPage'));
const item = page(() => import('@/pages/feed/ItemPage'));
const userPage = page(async () => ({ default: (await placeholders()).UserPagePlaceholder }));
const donations = page(() => import('@/pages/donations/DonationsPage'));
const newItem = page(() => import('@/pages/donations/NewItemPage'));
const interests = page(() => import('@/pages/donations/InterestsPage'));
const chats = page(async () => ({ default: (await placeholders()).ChatsPlaceholder }));
const profile = page(async () => ({ default: (await placeholders()).ProfilePlaceholder }));
const settings = page(async () => ({ default: (await placeholders()).SettingsPlaceholder }));
const admin = page(async () => ({ default: (await placeholders()).AdminPlaceholder }));
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
                  { path: 'chats', handle: title('pages.chats'), ...chats },
                  { path: 'chats/:itemId', handle: title('pages.chat'), ...chats },
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
                  { path: 'admin/ngos', handle: title('pages.adminNgos'), ...admin },
                  { path: 'admin/reports', handle: title('pages.adminReports'), ...admin },
                  { path: 'admin/reports/:reportId', handle: title('pages.adminReport'), ...admin },
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
