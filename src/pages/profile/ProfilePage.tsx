import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/core/auth/useAuth';
import {
  AccountSection,
  DeleteAccountSection,
  NgoStatusSection,
  PasswordSection,
} from '@/features/profile/AccountSections';
import { AvatarSection, BannerSection } from '@/features/profile/ImageSections';
import { AddressSection, BioSection, CategoriesSection, ContactSection } from '@/features/profile/PageSections';

type TabName = 'pagina' | 'conta';

/**
 * Perfil (guia, F4 e F12) em duas abas (decisão da fase 6): "Minha página" (o que aparece em /u/:id)
 * e "Conta" (dados, situação da ONG, senha, excluir). Cada seção salva sozinha. A aba fica na URL
 * (`?aba=conta`), para o banner da ONG rejeitada levar direto ao reenvio do documento.
 */
export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: TabName = params.get('aba') === 'conta' ? 'conta' : 'pagina';
  if (!user) return null;
  const ngo = user.role === 'NGO' && user.ngo_profile;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={tab}
          onChange={(_, v: TabName) => setParams(v === 'conta' ? { aba: 'conta' } : {}, { replace: true })}
          aria-label={t('tabs.label')}
        >
          <Tab value="pagina" label={t('tabs.page')} />
          <Tab value="conta" label={t('tabs.account')} />
        </Tabs>
        <Button to={`/u/${user.id}`} variant="ghost" icon={<OpenInNewRounded />}>
          {t('common.viewPage')}
        </Button>
      </div>
      {tab === 'pagina' ? (
        <>
          <AvatarSection user={user} />
          {ngo && <BannerSection user={user} />}
          <BioSection user={user} />
          {ngo && (
            <>
              <ContactSection user={user} />
              <CategoriesSection user={user} />
              <AddressSection user={user} />
            </>
          )}
        </>
      ) : (
        <>
          <AccountSection user={user} />
          {ngo && <NgoStatusSection user={user} />}
          <PasswordSection />
          <DeleteAccountSection />
        </>
      )}
    </section>
  );
}
