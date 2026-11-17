import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { LoginPromptContext } from '@/core/feedback/useLoginPrompt';
import { Button } from '../ui/Button';
import { Illustration } from '../ui/Illustration';
import { Modal } from '../ui/Modal';

/** Modal "Entre para continuar" do modo visitante; depois do login, volta para `redirect`. */
export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [redirect, setRedirect] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const prompt = useCallback(
    (to?: string) => setRedirect(to ?? location.pathname + location.search),
    [location.pathname, location.search],
  );
  const api = useMemo(() => ({ prompt }), [prompt]);

  const go = (path: '/login' | '/register') => {
    const target = redirect ?? '/feed';
    setRedirect(null);
    navigate(`${path}?redirect=${encodeURIComponent(target)}`);
  };

  return (
    <LoginPromptContext.Provider value={api}>
      {children}
      <Modal open={redirect !== null} onClose={() => setRedirect(null)} title={t('loginPrompt.title')} size="sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <Illustration name="login" className="max-w-48" />
          <p className="text-fg-muted">{t('loginPrompt.description')}</p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button fullWidth onClick={() => go('/login')}>
              {t('loginPrompt.login')}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => go('/register')}>
              {t('loginPrompt.register')}
            </Button>
          </div>
        </div>
      </Modal>
    </LoginPromptContext.Provider>
  );
}
