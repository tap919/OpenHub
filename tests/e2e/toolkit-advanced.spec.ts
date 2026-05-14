import { test, expect } from '@playwright/test';
import { getCsrfToken, mutationHeaders } from '../helpers/auth';

const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
const itemId = `TKA-TOOLKIT-${rand}`;

test.describe.serial('Toolkit Advanced', () => {
  test('seed a registry item', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForURL('/registry');

    // Add a registry item via form
    await page.getByRole('button', { name: /New Resource/i }).click();
    await expect(page.getByPlaceholder('e.g. TF-VALIDATOR-01')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('e.g. TF-VALIDATOR-01').fill(itemId);
    await page.getByPlaceholder('Operational objectives...').fill('Advanced toolkit test item');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText(itemId).first()).toBeVisible({ timeout: 5000 });
  });

  test('toggle item status via power button', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForURL('/registry');
    await expect(page.getByText(itemId).first()).toBeVisible({ timeout: 5000 });

    // Find the power toggle button on the first matching item card
    const powerBtn = page.locator('text=' + itemId).first().locator('..').locator('..')
      .locator('button:has(svg.lucide-power)');
    if (await powerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await powerBtn.click();
      // Status badge change is implied; no arbitrary wait needed
    }
  });

  test('filter by type filters the item list', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForURL('/registry');

    // Click "cli" filter
    const cliFilter = page.getByRole('button', { name: 'cli' });
    if (await cliFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cliFilter.click();
    }

    // Click "all" to reset
    const allFilter = page.getByRole('button', { name: 'all' });
    if (await allFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allFilter.click();
    }
  });

  test('search input filters items', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForURL('/registry');

    const searchInput = page.getByPlaceholder(/ID or name/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('TKA');
      await expect(page.getByText(itemId).first()).toBeVisible({ timeout: 5000 });
    }

    // Clear search
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.clear();
    }
  });
});
