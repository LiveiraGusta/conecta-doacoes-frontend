import { expect, test, type Page } from '@playwright/test';

/**
 * Fluxos de leitura contra a API real (seed de demo do backend).
 * Pré-requisito: API em VITE_API_URL e front com `npm run dev` (ver playwright.real.config.ts).
 */

const DEMO_PASSWORD = 'Demo1234';
const DONOR = 'doadora@demo.conectadoacoes.local';
const NGO_ACTIVE = 'ong.ativa@demo.conectadoacoes.local';
const NGO_PENDING = 'ong.pendente@demo.conectadoacoes.local';

/** Chamadas à API que falharam. O /auth/me 401 da primeira carga (sem sessão) é esperado. */
function trackApiErrors(page: Page): string[] {
  const failures: string[] = [];
  page.on('response', (r) => {
    if (!r.url().includes('/api/v1/')) return;
    if (r.status() < 400) return;
    if (r.status() === 401 && r.url().endsWith('/auth/me')) return;
    failures.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^.*\/api\/v1/, '')}`);
  });
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
  return failures;
}

async function loginByForm(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/^e-?mail$/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(password);
  await page.getByRole('button', { name: /^entrar$/i }).click();
}

test.describe.configure({ mode: 'serial' });

test('doadora entra pelo formulário e vê o feed com itens reais', async ({ page }) => {
  const failures = trackApiErrors(page);
  await loginByForm(page, DONOR, DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByText('Casaco infantil tamanho 6').first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('doadora abre a lista de conversas sem erro', async ({ page }) => {
  const failures = trackApiErrors(page);
  await loginByForm(page, DONOR, DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/feed/);
  await page.goto('/chats');
  await expect(page.getByRole('heading', { name: 'Conversa' }).first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('ONG aprovada entra e abre o feed', async ({ page }) => {
  const failures = trackApiErrors(page);
  await loginByForm(page, NGO_ACTIVE, DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByText('Casaco infantil tamanho 6').first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('ONG em análise vê o feed (o spec libera o feed para DONOR e NGO)', async ({ page }) => {
  // Só "demonstrar interesse" exige ONG ATIVO (409/403 na API). Este teste não altera dados.
  const failures = trackApiErrors(page);
  await loginByForm(page, NGO_PENDING, DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByText('Casaco infantil tamanho 6').first()).toBeVisible();
  expect(failures).toEqual([]);
});

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

test('admin vê a fila de ONGs em análise', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Defina ADMIN_EMAIL e ADMIN_PASSWORD para rodar este teste.');
  const failures = trackApiErrors(page);
  await loginByForm(page, adminEmail!, adminPassword!);
  await expect(page).toHaveURL(/\/admin\/ngos/);
  await expect(page.getByText('Instituto Novo Começo').first()).toBeVisible();
  expect(failures).toEqual([]);
});
