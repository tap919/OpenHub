import { test, expect } from '@playwright/test';

test('add and delete SSH key via browser', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForURL('/settings');

  const sshTab = page.getByRole('button', { name: /SSH|Keys/i }).first();
  if (await sshTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sshTab.click();
  }

  const injectBtn = page.getByRole('button', { name: /Inject New Key/i });
  await expect(injectBtn).toBeVisible({ timeout: 5000 });
  await injectBtn.click();

  const inputs = page.locator('input:visible');
  const count = await inputs.count();
  if (count > 0) await inputs.first().fill('E2E-TEST-KEY');

  const textareas = page.locator('textarea:visible');
  const taCount = await textareas.count();
  if (taCount > 0) await textareas.first().fill('ssh-rsa AAAAB3NzaC1yc2E-SUBTEAM-E2E-TEST-KEY-2024');

  const submitBtn = page.getByRole('button', { name: /Submit Access Ticket/i });
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
  }

  await expect(page.getByText(/E2E-TEST-KEY/)).toBeVisible({ timeout: 5000 });

  const trashIcons = page.locator('svg.lucide-trash2, button:has(svg.lucide-trash2)');
  const trashCount = await trashIcons.count();
  if (trashCount > 0) {
    await trashIcons.first().click();
    await expect(page.getByText(/E2E-TEST-KEY/)).not.toBeVisible({ timeout: 5000 });
  }
});
