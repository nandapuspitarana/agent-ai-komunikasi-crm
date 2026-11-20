import { test, expect, type Page } from '@playwright/test';
import { PERIODS, USERS, apiLogin, cardValue, dbActivity, dictionary, openAdmin, shot, stub, tableRows } from './helpers';

// A refetch that fails after one good load must not wipe the table: search, sort and the expanded row survive,
// the banner explains, CSV is disabled while the error is shown, and recovery brings the new period in.
const EN = dictionary('en');
const SORTED = /(^|\s)text-slate-900(\s|$)/;
const exportBtn = (page: Page) => page.getByRole('button', { name: EN.admin.exportCsv, exact: true });

async function arrangeTable(page: Page) {
  await page.getByRole('searchbox').fill('pt');
  await page.getByRole('button', { name: 'Sort by Tenant' }).click();
  await page.getByRole('button', { name: 'PT Beta' }).click();
  await expectTableState(page);
}
async function expectTableState(page: Page) {
  await expect(page.locator('table')).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('pt');
  await expect(page.getByRole('button', { name: 'Sort by Tenant' })).toHaveClass(SORTED);
  expect((await tableRows(page)).map((r) => r[1])).toEqual(['PT Alpha', 'PT Beta', 'PT Delta']);
  await expect(page.getByRole('button', { name: 'PT Beta' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('table tbody tr.bg-slate-50')).toHaveCount(1);
}

test.describe('refetch failure after a good load', () => {
  test.afterEach(async ({ request }) => stub(request, 'reset'));

  test('overview API fails on refetch -> last good data stays, error banner, CSV disabled; Retry recovers', async ({ page, request }) => {
    await stub(request, 'reset');
    await apiLogin(page, USERS.superAdmin);
    await openAdmin(page, 'en');
    await arrangeTable(page);
    const thisMonthActive = String(dbActivity(PERIODS.thisMonth).platformActive);
    const lastMonthActive = String(dbActivity(PERIODS.lastMonth).platformActive);
    expect(thisMonthActive).not.toBe(lastMonthActive);
    expect(await cardValue(page, 'Active users')).toBe(thisMonthActive);
    await expect(exportBtn(page)).toBeEnabled();

    // The whole API call fails (the stub is down too); this is the only path where the page keeps stale data.
    await stub(request, '500');
    let failed = 0;
    await page.route('**/api/admin/overview**', async (route) => {
      failed++;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'overview_failed', message: 'x' } }) });
    });
    await page.getByRole('button', { name: EN.admin.periodLastMonth, exact: true }).click();
    const alert = page.getByRole('alert').filter({ hasText: EN.admin.loadError });
    await expect(alert).toBeVisible({ timeout: 20_000 });
    expect(failed).toBeGreaterThanOrEqual(1);
    await expect(alert).toContainText(EN.admin.errGeneric);
    await expect(page.locator('.animate-pulse')).toHaveCount(0);
    await expectTableState(page);
    expect(await cardValue(page, 'Active users'), 'last good (this month) data still shown').toBe(thisMonthActive);
    await expect(exportBtn(page)).toBeDisabled();
    await shot(page, 'refetch-error-kept-table');

    // Recover: API and stub healthy, Retry
    await page.unroute('**/api/admin/overview**');
    await stub(request, 'ok');
    await alert.getByRole('button', { name: EN.admin.retry }).click();
    await expect(alert).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    expect(await cardValue(page, 'Active users'), 'now last month').toBe(lastMonthActive);
    await expectTableState(page);
    await expect(exportBtn(page)).toBeEnabled();
  });

  test('stub returns 500 on refetch -> table stays mounted with AI "—", AI banner, CSV disabled; healthy stub recovers', async ({ page, request }) => {
    await stub(request, 'reset');
    await apiLogin(page, USERS.superAdmin);
    await openAdmin(page, 'en');
    await arrangeTable(page);

    await stub(request, '500');
    await page.getByRole('button', { name: EN.admin.periodLastMonth, exact: true }).click();
    await expect(page.getByText(EN.admin.warnAiUnavailable)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('.animate-pulse')).toHaveCount(0);
    await expectTableState(page);
    // the API itself answered 200 (DB activity for the new period, AI unavailable): no load-error alert, so no Retry
    await expect(page.getByRole('alert').filter({ hasText: EN.admin.loadError })).toHaveCount(0);
    expect(await cardValue(page, 'Active users')).toBe(String(dbActivity(PERIODS.lastMonth).platformActive));
    expect(await cardValue(page, 'Estimated AI cost')).toBe('—');
    await expect(exportBtn(page)).toBeDisabled();
    await shot(page, 'refetch-stub500-kept-table');

    await stub(request, 'ok');
    await page.getByRole('button', { name: EN.admin.periodThisMonth, exact: true }).click();
    await expect(page.getByText(EN.admin.warnAiUnavailable)).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    await expectTableState(page);
    await expect(exportBtn(page)).toBeEnabled();
  });
});
