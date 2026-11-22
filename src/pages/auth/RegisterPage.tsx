import Link from '@mui/material/Link';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { RegisterDonorForm } from '@/features/auth/RegisterDonorForm';
import { RegisterNgoForm } from '@/features/auth/RegisterNgoForm';

type Kind = 'doador' | 'ong';

/**
 * Cadastro: formulário à esquerda e a ilustração à direita (o inverso do login).
 * Abas do MUI "Quero doar" / "Sou uma ONG" no `?tipo=` (dá para mandar o link direto para ONGs).
 */
export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const [params, setParams] = useSearchParams();
  const kind: Kind = params.get('tipo') === 'ong' ? 'ong' : 'doador';
  const redirect = params.get('redirect');

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
            component={RouterLink}
            to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
            sx={{ fontWeight: 600 }}
          >
            {t('register.login')}
          </Link>
        </>
      }
    >
      <Tabs
        value={kind}
        onChange={(_e, next: Kind) =>
          setParams(
            (p) => {
              p.set('tipo', next);
              return p;
            },
            { replace: true },
          )
        }
        variant="fullWidth"
        selectionFollowsFocus
        aria-label={t('register.tabsLabel')}
      >
        <Tab value="doador" label={t('register.donorTab')} id="aba-doador" aria-controls="painel-doador" />
        <Tab value="ong" label={t('register.ngoTab')} id="aba-ong" aria-controls="painel-ong" />
      </Tabs>
      <div role="tabpanel" id={`painel-${kind}`} aria-labelledby={`aba-${kind}`}>
        {/* key: trocar de aba começa um formulário limpo */}
        {kind === 'ong' ? <RegisterNgoForm key="ong" /> : <RegisterDonorForm key="doador" />}
      </div>
    </AuthSplitLayout>
  );
}
