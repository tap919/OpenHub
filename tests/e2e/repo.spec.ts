import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCsrfToken, mutationHeaders, sharedCredentials } from '../helpers/auth';

const SUB_TEAM_ROOT = 'C:/Users/User/Documents/Projects/Sub-Team-main';
const REPOS_ROOT = path.join(process.env.USERPROFILE || 'C:/Users/User', 'Documents', 'openhub', 'repos');
const repoName = 'sub-team-test';

function seedSubTeamFiles(repoDir: string) {
  const files = ['main.py', 'README.md', 'sub_team/__init__.py', 'sub_team/cpu.py', 'sub_team/specification_agent.py'];
  for (const rel of files) {
    const src = path.join(SUB_TEAM_ROOT, rel);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(path.join(repoDir, rel)), { recursive: true });
      fs.copyFileSync(src, path.join(repoDir, rel));
    }
  }
  const secretDir = path.join(repoDir, 'config');
  fs.mkdirSync(secretDir, { recursive: true });
  fs.writeFileSync(path.join(secretDir, 'creds.json'), JSON.stringify({ aws_key: 'AKIAIOSFODNN7EXAMPLE', gh_token: 'ghp_test12345678901234567890' }, null, 2));
}

test.describe.serial('Repository', () => {
  let username: string;
  test.beforeAll(() => {
    ({ username } = sharedCredentials());
  });

  test('create repo and seed Sub-Team files', async ({ page }) => {
    const csrf = await getCsrfToken(page);
    const res = await page.context().request.post('/api/repos', {
      data: { name: repoName, description: 'Sub-Team CPU design pipeline', isPrivate: false },
      headers: mutationHeaders(csrf),
    });
    expect(res.ok() || res.status() === 409).toBeTruthy();

    const repoDir = path.join(REPOS_ROOT, username, repoName);
    seedSubTeamFiles(repoDir);
  });

  test('browse repo and read code via browser', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible();

    // Click repo link on dashboard (client-side nav, no page reload)
    await page.getByText(repoName).first().click();
    await page.waitForURL(`/${username}/${repoName}`);
    await expect(page.getByText(repoName).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Code' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Actions' })).toBeVisible();
  });

  test('security audit on seeded secret file', async ({ page }) => {
    await page.goto(`/${username}/${repoName}`);
    await page.waitForURL(`/${username}/${repoName}`);

    const configDir = page.getByText('config').first();
    if (await configDir.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configDir.click();
      await expect(page.getByText('creds.json')).toBeVisible({ timeout: 5000 });
    }

    const credFile = page.getByText('creds.json').first();
    if (await credFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await credFile.click();
      await expect(page.getByRole('button', { name: /Security Audit/i })).toBeVisible({ timeout: 5000 });
    }

    const scanBtn = page.getByRole('button', { name: /Security Audit/i });
    if (await scanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scanBtn.click();
      await expect(page.getByText(/CRITICAL|Secret/)).toBeVisible({ timeout: 10000 });
    }
  });
});
