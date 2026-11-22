import { expect, type Page } from '@playwright/test';

/** Contas do painel "Entrar como" (só no modo mock). */
export type MockAccount = 'Doadora' | 'ONG aprovada' | 'ONG em análise' | 'ONG rejeitada' | 'Admin';

/** Entra pelo painel do modo mock e espera a tela inicial do perfil. */
export async function loginAs(page: Page, account: MockAccount) {
  await page.goto('/login');
  await page.getByRole('button', { name: account }).click();
  await expect(page).toHaveURL(account === 'Admin' ? /\/admin\/ngos/ : /\/feed/);
}

/** Navega pelo menu (sem recarregar: os dados do mock vivem na memória da página). */
export async function goTo(page: Page, name: string) {
  await page.getByRole('link', { name, exact: true }).first().click();
}

/** PNG pequeno e válido (4×3, azul) para os uploads. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAEklEQVR4nGNgYPgPRUgsBgYGACp8BfvBqYlLAAAAAElFTkSuQmCC',
  'base64',
);
