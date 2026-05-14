import { test, expect } from '@playwright/test';

const rand = Math.random().toString(36).substring(2, 10);
const email = `e2e-auth-${rand}@openhub.local`;
const password = 'AuthTest123!';
const username = `authtester${rand.substring(0, 6)}`;

async function browserLogin(page: any, user: string, pass: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByPlaceholder('dev@localhost').fill(user);
  await page.getByPlaceholder('••••••••').fill(pass);
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/');
}

test.describe.serial('Auth', () => {
  test('register via API, login via browser form', async ({ page }) => {
    test.setTimeout(60000);

    // Seed user via API — no Vite compilation needed
    const ctx = page.context();
    const regRes = await ctx.request.post('/api/auth/register', {
      data: { email, password, username },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([200, 201, 409]).toContain(regRes.status());

    await browserLogin(page, email, password);

    await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Active Contracts')).toBeVisible();
  });

  test('dashboard shows navigation elements after login', async ({ page }) => {
    test.setTimeout(60000);
    // Page state unreliable between serial tests — refresh via browser login
    await browserLogin(page, email, password);
    await expect(page.getByText('Logistics')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Orchestration')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Cloud')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Workspace')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Studio')).toBeVisible({ timeout: 15000 });
  });

  test('invalid login shows error', async ({ page }) => {
    test.setTimeout(60000);
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('dev@localhost').fill('nobody@fake.local');
    await page.getByPlaceholder('••••••••').fill('badpassword');
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 10000 });
  });

  test('logout clears session', async ({ page }) => {
    test.setTimeout(60000);

    // Re-establish session via API (cookies cleared in test 3)
    const loginRes = await page.context().request.post('/api/auth/login', {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loginRes.status()).toBe(200);

    // Navigate to dashboard — wait for ProtectedRoute auth check to settle
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Logistics')).toBeVisible({ timeout: 20000 });

    // Logout
    await page.getByText('Sign out').click();
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'OpenHub' })).toBeVisible();

    // Verify unauthenticated user is redirected from dashboard
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'OpenHub' })).toBeVisible();
  });
});
