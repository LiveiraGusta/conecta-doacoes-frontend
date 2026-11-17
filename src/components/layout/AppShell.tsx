import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { AppShellDesktop } from './AppShell.desktop';
import { AppShellMobile } from './AppShell.mobile';

/**
 * Casca das páginas logadas e de visitante. Desktop e mobile são componentes separados
 * (decisão do plano: as telas do design são bem diferentes), escolhidos pelo breakpoint `md`.
 */
export function AppShell() {
  return useIsMobile() ? <AppShellMobile /> : <AppShellDesktop />;
}
