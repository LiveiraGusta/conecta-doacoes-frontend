import { expect, test } from '@playwright/test';
import { goTo, loginAs } from './helpers';

test('doadora escolhe a ONG, conversa em tempo real e recebe a resposta', async ({ page }) => {
  await loginAs(page, 'Doadora');
  await goTo(page, 'Doações');
  await page.getByRole('link', { name: 'Ver 3 ONGs interessadas' }).click();
  await page.getByRole('button', { name: 'Escolher ONG Salvadora' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Escolher e conversar' }).click();
  await expect(page).toHaveURL(/\/chats\//);

  const input = page.getByRole('textbox', { name: /Mensagem para ONG Salvadora/ });
  await input.fill('Oi! Posso entregar no sábado.');
  await input.press('Enter');
  const log = page.getByRole('log', { name: 'Mensagens' });
  await expect(log.getByText('Oi! Posso entregar no sábado.')).toBeVisible();
  // O mock responde pela outra parte em 2 s, pelo WebSocket.
  await expect(log.locator('li')).toHaveCount(2, { timeout: 8000 });
});

test('ONG confirma o recebimento e a conversa vira só leitura', async ({ page }) => {
  await loginAs(page, 'ONG aprovada');
  await goTo(page, 'Conversas');
  await page
    .getByRole('link', { name: /Marina Souza/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.getByText('Doação concluída. A conversa fica disponível só para leitura.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Mensagem para/ })).toHaveCount(0);
});
