import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authDir = path.join(process.cwd(), 'playwright', '.auth');
const authFile = path.join(authDir, 'user.json');
const credsFile = path.join(authDir, 'credentials.json');

export const SHARED_EMAIL = 'e2e-shared@openhub.local';
export const SHARED_PASSWORD = 'SharedTest123!';
export const SHARED_USERNAME = 'e2eshared';

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });

  await page.goto('/login');

  await page.getByRole('button', { name: 'Create Account' }).first().click();
  await page.getByPlaceholder('dev@localhost').fill(SHARED_EMAIL);
  await page.getByPlaceholder('developer').fill(SHARED_USERNAME);
  await page.getByPlaceholder('••••••••').fill(SHARED_PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Create Account' }).click();

  // Wait for redirect to dashboard (success) or error message (user exists)
  await page.waitForFunction(
    () => window.location.pathname === '/' || document.body.innerText.includes('already exists') || document.body.innerText.includes('taken'),
    { timeout: 10000 }
  );

  if (!page.url().endsWith('/')) {
    // User already exists (e.g., reused server), log in instead
    await page.goto('/login');
    await page.getByPlaceholder('dev@localhost').fill(SHARED_EMAIL);
    await page.getByPlaceholder('••••••••').fill(SHARED_PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/');
  }

  await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible();

  await page.context().storageState({ path: authFile });

  fs.writeFileSync(credsFile, JSON.stringify({
    email: SHARED_EMAIL,
    password: SHARED_PASSWORD,
    username: SHARED_USERNAME,
  }, null, 2));
});
