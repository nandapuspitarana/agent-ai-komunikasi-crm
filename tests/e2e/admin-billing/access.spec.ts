import { test, expect } from '@playwright/test';
import { USERS, PASSWORD, apiLogin, shot, stub } from './helpers';

test.describe('access control', () => {
  test.beforeEach(async ({ request }) => stub(request, 'reset'));

  test('unauthenticated API call -> 401', async ({ request }) => {
    const res = await request.get('/api/admin/overview');
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  test('SUPER_ADMIN logs in via the login form, sees the Admin nav item and reaches /admin', async ({ page }) => {
    // Wait for hydration: submitting before React attaches onSubmit does a native GET with the
    // credentials in the query string (pre-existing login-page behaviour, see report).
    await page.goto('/en/login', { waitUntil: 'networkidle' });
    await page.fill('#email', USERS.superAdmin);
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/en\/(inbox|dashboard)/, { timeout: 60_000 });

    const nav = page.locator('nav a[href="/en/admin"]');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveText(/Admin/);
    await nav.click();
    await page.waitForURL(/\/en\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin · Billing' })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
    await shot(page, 'sa-admin-desktop');
  });

  test('BUSINESS_PARTNER: no nav item, /admin shows 403, API returns 403', async ({ page }) => {
    await apiLogin(page, USERS.partner);
    await page.goto('/en/inbox');
    await expect(page.locator('nav a[href="/en/inbox"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('nav a[href="/en/admin"]')).toHaveCount(0);

    await page.goto('/en/admin');
    await expect(page.getByText('403 — Super Admin only')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
    await shot(page, 'bp-admin-403');

    const api = await page.context().request.get('/api/admin/overview');
    expect(api.status()).toBe(403);
    expect(await api.json()).toEqual({ error: 'Forbidden' });
  });

  test('AGENT: API returns 403', async ({ page }) => {
    await apiLogin(page, USERS.agent);
    const api = await page.context().request.get('/api/admin/overview?from=2026-11-01&to=2026-11-30');
    expect(api.status()).toBe(403);
  });
});
