import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test('celular: barra de baixo, conversa em tela cheia e voltar', async ({ page }) => {
  await loginAs(page, 'Doadora');
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await nav.getByRole('link', { name: 'Conversas' }).click();
  await page.getByRole('link', { name: /ONG Salvadora/ }).click();
  await expect(page.getByRole('textbox', { name: /Mensagem para/ })).toBeInViewport();
  await page.getByRole('button', { name: 'Voltar para as conversas' }).click();
  await expect(page.getByRole('list', { name: 'Conversas' })).toBeVisible();
});

test('celular: o feed não rola para os lados', async ({ page }) => {
  await loginAs(page, 'ONG aprovada');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
