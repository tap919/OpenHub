import { test, expect } from '@playwright/test';

const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
const itemId = `OPENHUB-TOOLKIT-${rand}`;

test.describe.serial('Registry', () => {
  test('add new resource via browser form', async ({ page }) => {
    await page.goto('/registry');
    await page.waitForURL('/registry');

    const newResBtn = page.getByRole('button', { name: /New Resource/i });
    await expect(newResBtn).toBeVisible({ timeout: 10000 });
    await newResBtn.click();

    const nameInput = page.getByPlaceholder('e.g. TF-VALIDATOR-01');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(itemId);

    await page.getByPlaceholder('Operational objectives...').fill('OpenHub toolkit resource for testing');

    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText(itemId).first()).toBeVisible({ timeout: 5000 });
  });
});
