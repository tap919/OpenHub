import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCsrfToken, mutationHeaders, sharedCredentials } from '../helpers/auth';

const REPOS_ROOT = path.join(process.env.USERPROFILE || 'C:/Users/User', 'Documents', 'openhub', 'repos');
const repoName = 'workspace-test';

test.describe.serial('Workspace', () => {
  let username: string;
  test.beforeAll(() => {
    ({ username } = sharedCredentials());
  });

  test('create repo with files', async ({ page }) => {
    const csrf = await getCsrfToken(page);
    const res = await page.context().request.post('/api/repos', {
      data: { name: repoName, description: 'Workspace test repo', isPrivate: false },
      headers: mutationHeaders(csrf),
    });
    expect(res.ok() || res.status() === 409).toBeTruthy();

    const repoDir = path.join(REPOS_ROOT, username, repoName);
    const subDir = path.join(repoDir, 'src');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(repoDir, 'index.ts'), 'export function hello() {\n  return "Hello from workspace!";\n}');
    fs.writeFileSync(path.join(subDir, 'utils.ts'), 'export function add(a: number, b: number) {\n  return a + b;\n}');
  });

  test('workspace page loads with breadcrumb', async ({ page }) => {
    await page.goto(`/workspace/${username}/${repoName}`);
    await page.waitForURL(`/workspace/${username}/${repoName}`);

    // Breadcrumb should show repo name
    await expect(page.getByText(repoName).first()).toBeVisible({ timeout: 10000 });
    // Save button exists (disabled until file opened)
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 });
  });

  test('terminal and save buttons are available', async ({ page }) => {
    await page.goto(`/workspace/${username}/${repoName}`);
    await page.waitForURL(`/workspace/${username}/${repoName}`);

    await expect(page.getByRole('button', { name: 'Terminal' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 });
  });
});
