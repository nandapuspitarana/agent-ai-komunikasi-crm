import { test, expect } from '@playwright/test';
import { USERS, apiLogin, dictionary, stub, shot } from './helpers';

// Only meaningful when the dev server runs with an INVALID BILLING_TIMEZONE (set BAD_BILLING_TZ=1 for that run).
test.skip(!process.env.BAD_BILLING_TZ, 'needs the dev server started with an invalid BILLING_TIMEZONE');

test('invalid BILLING_TIMEZONE -> 500 server_timezone, localized message in the UI', async ({ page, request }) => {
  await stub(request, 'reset');
  await apiLogin(page, USERS.superAdmin);
  for (const qs of ['', '?from=2026-11-01&to=2026-11-30']) {
    const res = await page.context().request.get(`/api/admin/overview${qs}`);
    expect(res.status()).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'server_timezone', message: expect.stringContaining('Invalid time zone') } });
  }
  for (const locale of ['en', 'id'] as const) {
    const dict = dictionary(locale);
    await page.goto(`/${locale}/admin`);
    const alert = page.locator('[role="alert"]', { hasText: dict.admin.loadError });
    await expect(alert).toBeVisible({ timeout: 60_000 });
    await expect(alert).toContainText(dict.admin.errServerTimezone);
    await expect(alert).not.toContainText('HTTP 500');
    await shot(page, `server-tz-${locale}`);
  }
});
