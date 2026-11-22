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
  await expect(page.getByText('Nenhuma ONG esperando análise.')).toBeVisible();

  await goTo(page, 'Denúncias');
  await page.getByRole('link', { name: /Ver denúncia sobre Leite em pó/ }).click();
  await expect(page.getByText('Mensagem da denunciada').first()).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como resolvida' }).click();
  await expect(page.getByText('Esta denúncia já foi resolvida.')).toBeVisible();
});

test('Admin filtra as denúncias de anúncio e remove o anúncio com motivo', async ({ page }) => {
  await loginAs(page, 'Admin');
  await goTo(page, 'Denúncias');
  await page.getByRole('button', { name: 'Anúncio', exact: true }).click();
  await page.getByRole('link', { name: 'Ver denúncia sobre Revistas antigas' }).first().click();
  await expect(page.getByRole('region', { name: 'Conteúdo do anúncio' })).toBeVisible();
  await expect(page.getByText(/saiu do ar sozinho porque 3 pessoas/)).toBeVisible();

  await page.getByRole('button', { name: 'Remover anúncio' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remover anúncio' });
  await dialog.getByLabel(/Motivo/).fill('Capa de revista com nudez explícita.');
  await dialog.getByRole('button', { name: 'Remover anúncio' }).click();
  await expect(page.getByText('Anúncio removido.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Republicar anúncio' })).toBeVisible();
});
