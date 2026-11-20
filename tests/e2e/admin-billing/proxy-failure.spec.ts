import { test, expect, type Page } from '@playwright/test';
import { USERS, apiLogin, cardValue, shot, stub, stubLog, tableRows, totalRow } from './helpers';

const NA = '—';

async function assertDegraded(page: Page, label: string) {
  await expect(page.getByText('AI service unreachable — token figures are unavailable')).toBeVisible();
  expect(await cardValue(page, 'Total tokens')).toBe(NA);
  expect(await cardValue(page, 'Estimated AI cost')).toBe(NA);
  // Prisma part still rendered
  expect(await cardValue(page, 'Active users')).toBe('8');
  const rows = await tableRows(page);
  expect(rows.length).toBe(4); // only CRM tenants: no orphan rows without proxy data
  for (const r of rows) {
    expect(r[7], `${r[1]} tokens`).toBe(NA);
    expect(r[8], `${r[1]} cost`).toBe(NA);
    expect(r[7]).not.toBe('0');
  }
  // null AI sorts last => all-null falls back to name order
  expect(rows.map((r) => r[1])).toEqual([...rows.map((r) => r[1])].sort((a, b) => a.localeCompare(b, 'en')));
  const tot = await totalRow(page);
  expect(tot[7]).toBe(NA);
  expect(tot[8]).toBe(NA);
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  await expect(page.locator('[role="list"] [role="listitem"]')).toHaveCount(0); // no trend chart
  const td = page.locator('table tbody tr', { hasText: 'PT Alpha' }).locator('td').nth(7);
  await expect(td).toHaveAttribute('title', 'Token data unavailable');
  await shot(page, `proxy-${label}`);
}

test.describe('proxy failure modes', () => {
  test.afterEach(async ({ request }) => stub(request, 'reset'));

  test('proxy returns HTTP 500 -> banner, "—" not 0, CSV disabled', async ({ page, request }) => {
    await stub(request, 'reset');
    await stub(request, '500');
    await apiLogin(page, USERS.superAdmin);
    const api = await (await page.context().request.get('/api/admin/overview')).json();
    expect(api.ai.status).toBe('unavailable');
    expect(api.ai.totals).toBeUndefined();
    expect(api.ai.error).toEqual({ code: 'ai_unavailable', message: expect.any(String) });
    expect(api.tenants.every((t: { ai: unknown }) => t.ai === null)).toBe(true);
    expect(api.platform.endUsers.activeInPeriod).toBe(8);

    await page.goto('/en/admin');
    await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
    await assertDegraded(page, '500');
    expect((await stubLog(request)).length).toBeGreaterThanOrEqual(2);
  });

  test('proxy hangs -> API gives up after ~15 s, same degraded UI', async ({ page, request }) => {
    test.setTimeout(180_000);
    await stub(request, 'reset');
    await stub(request, 'hang');
    await apiLogin(page, USERS.superAdmin);

    const t0 = Date.now();
    const res = await page.context().request.get('/api/admin/overview', { timeout: 60_000 });
    const elapsed = Date.now() - t0;
    test.info().annotations.push({ type: 'hang-elapsed-ms', description: String(elapsed) });
    expect(res.status()).toBe(200);
    const api = await res.json();
    expect(api.ai.status).toBe('unavailable');
    expect(elapsed).toBeGreaterThanOrEqual(14_500);
    expect(elapsed).toBeLessThan(30_000);

    await page.goto('/en/admin');
    // Skeleton while waiting, then degraded page after the 15 s timeout
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
    await assertDegraded(page, 'hang');
  });
});
