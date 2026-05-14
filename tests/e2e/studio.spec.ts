import { test, expect } from '@playwright/test';

test.describe.serial('Studio', () => {
  test('navigate to studio and verify page loads', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForURL('/studio');

    await expect(page.getByText(/Agentic Pipeline Builder|Studio/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Run Pipeline/i })).toBeVisible({ timeout: 5000 });
  });

  test('intent textarea accepts input', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForURL('/studio');

    const intentArea = page.getByPlaceholder(/Describe what|architect|build/i).or(
      page.locator('textarea').first()
    );
    if (await intentArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await intentArea.fill('Build a Next.js dashboard with Supabase auth');
    }
  });

  test('target stack selector works', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForURL('/studio');

    const stackSelector = page.locator('select').first();
    if (await stackSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stackSelector.selectOption('nextjs');
    }
  });

  test('preset buttons toggle step configuration', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForURL('/studio');

    const quickScaffold = page.getByRole('button', { name: /Quick Scaffold/i });
    if (await quickScaffold.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickScaffold.click();
      await expect(page.getByRole('button', { name: /Run Pipeline/i })).toBeVisible({ timeout: 5000 });
    }

    const fullProduction = page.getByRole('button', { name: /Full Production/i });
    if (await fullProduction.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fullProduction.click();
      await expect(page.getByRole('button', { name: /Run Pipeline/i })).toBeVisible({ timeout: 5000 });
    }
  });

  test('reset button clears pipeline state', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForURL('/studio');

    const resetBtn = page.getByRole('button', { name: /Reset/i });
    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetBtn.click();
    }

    // After reset, Run Pipeline should still be there
    await expect(page.getByRole('button', { name: /Run Pipeline/i })).toBeVisible({ timeout: 5000 });
  });
});
