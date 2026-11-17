import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { login } from '@/core/services/auth';
import { db, IDS, MOCK_PASSWORD } from '@/mocks/db';
import { useCompleteAuth } from './useCompleteAuth';

const ACCOUNTS = [
  { key: 'donor', id: IDS.donor },
  { key: 'ngoActive', id: IDS.ngoActive },
  { key: 'ngoPending', id: IDS.ngoPending },
  { key: 'ngoRejected', id: IDS.ngoRejected },
  { key: 'admin', id: IDS.admin },
] as const;

/**
 * "Entrar como" do `npm run dev:mock` (plano, "Dados mockados"). Só é carregado com VITE_USE_MOCKS=true
 * (import dinâmico na LoginPage), então os dados falsos não entram no bundle de produção.
 */
export default function MockLoginPanel() {
  const { t } = useTranslation('auth');
  const complete = useCompleteAuth();
  const mutation = useMutation({ mutationFn: login, onSuccess: (user) => complete(user) });

  return (
    <section aria-labelledby="mock-login" className="rounded-2xl border-2 border-dashed border-accent/50 p-4">
      <h2 id="mock-login" className="font-bold">
        {t('mock.title')}
      </h2>
      <p className="mb-3 text-xs text-fg-muted">{t('mock.description', { password: MOCK_PASSWORD })}</p>
      <ul className="flex flex-col gap-1">
        {ACCOUNTS.map(({ key, id }) => {
          const user = db.state.users.get(id)!.user;
          return (
            <li key={key}>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ email: user.email, password: MOCK_PASSWORD })}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-alt disabled:opacity-60"
              >
                <Avatar name={user.name} seed={user.id} size="sm" />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{t(`mock.accounts.${key}`)}</span>
                  <span className="text-xs text-fg-muted">{user.email}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
