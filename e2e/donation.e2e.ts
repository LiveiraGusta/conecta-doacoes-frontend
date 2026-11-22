import { expect, test } from '@playwright/test';
import { goTo, loginAs, PNG } from './helpers';

test('doadora publica uma doação em 3 etapas, com o editor de foto', async ({ page }) => {
  await loginAs(page, 'Doadora');
  await goTo(page, 'Doações');
  await page.getByRole('link', { name: 'Nova doação' }).first().click();
  await expect(page.getByRole('heading', { name: 'Fotos do item' })).toBeVisible();

  await page
    .getByTestId('photo-input')
    .setInputFiles(['a', 'b', 'c'].map((n) => ({ name: `${n}.png`, mimeType: 'image/png', buffer: PNG })));
  const editor = page.getByRole('dialog', { name: 'Editar foto' });
  for (let i = 0; i < 3; i++) {
    await editor.getByRole('button', { name: 'Girar 90°' }).click();
    await editor.getByRole('button', { name: 'Aplicar' }).click();
  }
  await expect(editor).toBeHidden();
  await expect(page.getByText('Capa', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Próximo' }).click();
  await page.getByLabel('Título').fill('Casaco de lã (teste e2e)');
  await page.getByLabel('Categoria').selectOption('ROUPAS');
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('heading', { name: 'Confira antes de publicar' })).toBeVisible();
  await page.getByRole('button', { name: 'Publicar doação' }).click();

  await expect(page).toHaveURL(/\/donations$/);
  await expect(page.getByText(/Doação publicada!/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver detalhes de Casaco de lã (teste e2e)' })).toBeVisible();
});
