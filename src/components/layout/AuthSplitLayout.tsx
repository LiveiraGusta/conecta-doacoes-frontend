import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { usePageTitle } from '@/core/hooks/usePageTitle';
import { cn } from '@/core/utils/cn';
import { Illustration, type IllustrationName } from '../ui/Illustration';
import { Logo } from './Logo';

export interface AuthSplitLayoutProps {
  /** Lado do formulário: login à direita, cadastro à esquerda (decisão do plano). */
  formSide: 'left' | 'right';
  illustration: IllustrationName;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Login, cadastro e senha. Desktop: 3/4 ilustração e 1/4 formulário (com largura mínima, para não espremer).
 * Mobile: formulário em tela cheia com uma ilustração pequena no topo.
 */
export function AuthSplitLayout(props: AuthSplitLayoutProps) {
  usePageTitle(); // título da aba
  return useIsMobile() ? <AuthSplitMobile {...props} /> : <AuthSplitDesktop {...props} />;
}

function FormColumn({ title, subtitle, children, footer }: AuthSplitLayoutProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Logo />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <div className="text-fg-muted">{subtitle}</div>}
      </header>
      {children}
      {footer && <footer className="text-center text-sm text-fg-muted">{footer}</footer>}
    </div>
  );
}

export function AuthSplitDesktop(props: AuthSplitLayoutProps) {
  const { t } = useTranslation();
  const art = (
    <section
      aria-hidden
      className="relative hidden flex-[3] flex-col items-center justify-center gap-8 overflow-hidden bg-primary p-12 text-on-primary md:flex"
    >
      {/* No fundo azul, o destaque da ilustração vai num tom claro da mesma cor (senão some). */}
      <Illustration name={props.illustration} className="max-w-xl text-primary-200" />
      <p className="max-w-lg text-center text-3xl leading-snug font-medium">{t('tagline')}</p>
    </section>
  );
  return (
    <div className={cn('flex min-h-dvh', props.formSide === 'left' && 'flex-row-reverse')}>
      {art}
      <main className="flex w-full flex-col justify-center overflow-y-auto bg-surface px-10 py-10 md:w-[max(25%,420px)] md:flex-none">
        <FormColumn {...props} />
      </main>
    </div>
  );
}

export function AuthSplitMobile(props: AuthSplitLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-surface">
      <div className="flex justify-center bg-primary-soft px-6 pt-6" aria-hidden>
        <Illustration name={props.illustration} className="h-36 w-auto" />
      </div>
      <div className="flex flex-1 flex-col px-5 py-6">
        <FormColumn {...props} />
      </div>
    </main>
  );
}
