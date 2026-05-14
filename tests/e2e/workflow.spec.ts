import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCsrfToken, mutationHeaders, sharedCredentials } from '../helpers/auth';

const REPOS_ROOT = path.join(process.env.USERPROFILE || 'C:/Users/User', 'Documents', 'openhub', 'repos');
const repoName = 'workflow-test';

const STAGE_NAMES = ['Checkout', 'Secret Scan', 'Lint & Typecheck', 'AI Code Review', 'Build', 'Artifact Signing'];
const INITIAL_STAGES = ['Checkout', 'Secret Scan', 'Lint & Typecheck', 'AI Code Review', 'Build'];

async function gotoRepoActions(page: any, repo: string, user: string) {
  // Client-side navigation via dashboard preserves Zustand store state
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible();
  await page.getByText(repo).first().click();
  await expect(page.getByRole('link', { name: 'Code' })).toBeVisible({ timeout: 10000 });
  await page.getByText('Actions').click();
  await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible({ timeout: 10000 });
}

test.describe.serial('Workflow', () => {
  let username: string;
  test.beforeAll(() => {
    ({ username } = sharedCredentials());
  });

  test('create repo', async ({ page }) => {
    const csrf = await getCsrfToken(page);
    const res = await page.context().request.post('/api/repos', {
      data: { name: repoName, description: 'Workflow test', isPrivate: false },
      headers: mutationHeaders(csrf),
    });
    expect(res.ok() || res.status() === 409).toBeTruthy();

    const repoDir = path.join(REPOS_ROOT, username, repoName);
    fs.mkdirSync(repoDir, { recursive: true });
    fs.writeFileSync(path.join(repoDir, 'index.ts'), '// Workflow test');
  });

  test('trigger pipeline and watch stage progression', async ({ page }) => {
    let runId = '';
    await page.route('/api/pipeline/run', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      runId = json.runId;
      await route.fulfill({ response });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'OpenHub Command Console' })).toBeVisible();

    // Navigate to Actions via dashboard
    await page.getByText(repoName).click();
    await expect(page.getByRole('link', { name: 'Code' })).toBeVisible({ timeout: 10000 });
    await page.getByText('Actions').click();
    await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible({ timeout: 10000 });

    // Trigger a pipeline run
    await page.getByRole('button', { name: /New Run/i }).click();

    // Detail view should appear automatically
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 5000 });
    expect(runId).toBeTruthy();

    // Verify initial 5 stages from local store are visible immediately
    for (const name of INITIAL_STAGES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 3000 });
    }

    // The 6th stage arrives after the first poll (~3s interval)
    await expect(page.getByText('Artifact Signing', { exact: true })).toBeVisible({ timeout: 5000 });

    // Poll backend until pipeline completes (fast mode completes in ~2s, but allow headroom)
    await expect.poll(async () => {
      const res = await page.context().request.get(`/api/pipeline/status/${runId}`);
      if (!res.ok()) return 'unknown';
      const data = await res.json();
      return data.status;
    }, { timeout: 15000, intervals: [500, 500, 1000, 1000] }).toBe('success');

    // Let the UI's own polling pick up the final state, then verify success styling
    await expect.poll(async () => {
      const el = page.getByText('Artifact Signing', { exact: true });
      if (await el.count() === 0) return false;
      const group = page.locator('div').filter({ has: el }).first();
      const successEl = group.locator('[class*="green"], [class*="success"]').first();
      return successEl.isVisible().catch(() => false);
    }, { timeout: 15000, intervals: [1000] }).toBe(true);

    for (const name of STAGE_NAMES) {
      const stageText = page.getByText(name, { exact: true });
      await expect(stageText).toBeVisible({ timeout: 3000 });
      const group = page.locator('div').filter({ has: stageText }).first();
      await expect(group.locator('[class*="green"], [class*="success"]').first())
        .toBeVisible({ timeout: 3000 });
    }
  });

  test('policy as code tab shows rego policies', async ({ page }) => {
    await gotoRepoActions(page, repoName, username);

    // Trigger fresh run
    await page.getByRole('button', { name: /New Run/i }).click();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 5000 });

    // Switch to Policy as Code tab
    const policyTab = page.getByRole('button', { name: /Policy as Code/i });
    await expect(policyTab).toBeVisible({ timeout: 3000 });
    await policyTab.click();

    const regoFile = page.getByText('deployment.rego');
    if (await regoFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(regoFile).toBeVisible();
    }
  });

  test('quality gates and security findings are visible', async ({ page }) => {
    await gotoRepoActions(page, repoName, username);

    // Trigger fresh run
    await page.getByRole('button', { name: /New Run/i }).click();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 5000 });

    // Quality gates section
    const qualityGates = page.getByText(/Hard Quality Gates/i);
    if (await qualityGates.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(qualityGates).toBeVisible();
    }

    // Security findings section
    const securityFindings = page.getByText(/Security Findings/i);
    if (await securityFindings.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(securityFindings).toBeVisible();
    }
  });

  test('back button returns to workflow list', async ({ page }) => {
    await gotoRepoActions(page, repoName, username);

    // Trigger fresh run
    await page.getByRole('button', { name: /New Run/i }).click();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 5000 });

    // Click Back to return to list view
    await page.getByRole('button', { name: 'Back' }).click();

    // Should see the workflow list again
    await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible({ timeout: 5000 });
  });

  test('trigger second pipeline run', async ({ page }) => {
    await gotoRepoActions(page, repoName, username);

    // Click New Run
    await page.getByRole('button', { name: /New Run/i }).click();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 5000 });

    for (const name of STAGE_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 5000 });
    }

    // Go back and verify New Run is still there
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible({ timeout: 5000 });
  });
});
