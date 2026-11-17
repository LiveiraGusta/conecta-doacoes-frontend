import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test('visitante vê o feed de todas as cidades e "Tenho interesse" pede login', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.getByRole('heading', { name: /Doações de todas as cidades/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tenho interesse' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Entre para continuar' })).toBeVisible();
});

test('ONG demonstra interesse, desfaz pelo snackbar e filtra por categoria', async ({ page }) => {
  await loginAs(page, 'ONG aprovada');
  const jeans = page.getByRole('article').filter({ hasText: 'Calças jeans (adulto)' });
  await jeans.getByRole('button', { name: 'Tenho interesse' }).click();
  await expect(jeans.getByRole('button', { name: 'Desfazer interesse' })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(jeans.getByRole('button', { name: 'Tenho interesse' })).toBeVisible();

  await page.getByRole('button', { name: 'Livros' }).click();
  await expect(page).toHaveURL(/categoria=livros/);
  await expect(page.getByRole('article')).toHaveCount(2);
});
