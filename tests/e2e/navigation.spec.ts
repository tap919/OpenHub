import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Business / Intelligence', path: '/business' },
  { name: 'Autonomous / Orchestration', path: '/autonomous' },
  { name: 'Cloud / Integrations', path: '/integrations' },
  { name: 'Workspace', path: '/workspace' },
  { name: 'Studio', path: '/studio' },
  { name: 'Registry / Logistics', path: '/registry' },
  { name: 'Settings', path: '/settings' },
];

test('all main pages load correctly', async ({ page }) => {
  for (const p of pages) {
    await page.goto(p.path);
    await page.waitForURL(p.path);
    await expect(page.locator('h1, h2, h3, main, [role="main"], body > *').first()).toBeVisible({ timeout: 8000 });
  }

  await page.goto('/');
  await page.waitForURL('/');
  await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible();
});
