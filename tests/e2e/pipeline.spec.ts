import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCsrfToken, mutationHeaders, sharedCredentials } from '../helpers/auth';

const REPOS_ROOT = path.join(process.env.USERPROFILE || 'C:/Users/User', 'Documents', 'openhub', 'repos');
const repoName = 'pipeline-test';

test.describe.serial('Pipeline', () => {
  let username: string;
  test.beforeAll(() => {
    ({ username } = sharedCredentials());
  });

  test('create repo and seed files', async ({ page }) => {
    const csrf = await getCsrfToken(page);
    const res = await page.context().request.post('/api/repos', {
      data: { name: repoName, description: 'Pipeline test', isPrivate: false },
      headers: mutationHeaders(csrf),
    });
    expect(res.ok() || res.status() === 409).toBeTruthy();

    const repoDir = path.join(REPOS_ROOT, username, repoName);
    fs.mkdirSync(repoDir, { recursive: true });
    fs.writeFileSync(path.join(repoDir, 'index.ts'), '// Test file');
  });

  test('trigger pipeline and view stages via browser', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible({ timeout: 15000 });

    await page.getByText(repoName).first().click();
    await page.waitForURL(`/${username}/${repoName}`, { timeout: 15000 });
    await page.getByText('Actions').click();
    await page.waitForURL(`/${username}/${repoName}/actions`, { timeout: 10000 });

    const newRun = page.getByRole('button', { name: /New Run/i });
    await expect(newRun).toBeVisible({ timeout: 10000 });
    await newRun.click();

    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 10000 });
  });
});
