import { expect, test } from '@playwright/test';
import { goTo, loginAs } from './helpers';

test('Admin aprova a ONG em análise e resolve a denúncia', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.getByRole('button', { name: 'Analisar Instituto Novo Começo' }).click();
  const review = page.getByRole('dialog', { name: 'Analisar Instituto Novo Começo' });
  await expect(review.locator('iframe')).toBeVisible();
  await review.getByRole('button', { name: 'Aprovar' }).click();
  await page
    .getByRole('dialog', { name: /Aprovar Instituto/ })
    .getByRole('button', { name: 'Aprovar' })
    .click();
  await expect(page.getByText('Instituto Novo Começo aprovada.')).toBeVisible();
  await expect(page.getByText('Nenhuma ONG esperando análise. 🎉')).toBeVisible();

  await goTo(page, 'Denúncias');
  await page.getByRole('link', { name: /Ver denúncia sobre Leite em pó/ }).click();
  await expect(page.getByText('Mensagem da denunciada').first()).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como resolvida' }).click();
  await expect(page.getByText('Esta denúncia já foi resolvida.')).toBeVisible();
});
