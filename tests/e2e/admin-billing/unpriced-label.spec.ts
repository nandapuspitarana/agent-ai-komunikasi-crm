import { test, expect } from '@playwright/test';
import { USERS, apiLogin, dictionary, shot, stub } from './helpers';

// The proxy reports calls without a model name as the sentinel "(unknown)" in unpriced_models.
// The banner must show the localized label for it and leave real model names untouched.
// The fixtures carry no unpriced model names, so the real API response is patched in the browser.
for (const locale of ['en', 'id', 'ko'] as const) {
  test(`unpriced banner localizes the "(unknown)" model sentinel (/${locale})`, async ({ page, request }) => {
    await stub(request, 'reset');
    const dict = dictionary(locale);
    await apiLogin(page, USERS.superAdmin);
    await page.route('**/api/admin/overview**', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      expect(json.ai.status).toBe('ok');
      json.ai.unpricedModels = ['(unknown)', 'acme-model-x'];
      await route.fulfill({ response: res, json });
    });
    await page.goto(`/${locale}/admin`);
    await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
    const expected = dict.admin.warnUnpricedModels.replace('{models}', `${dict.admin.unknownModel}, acme-model-x`);
    await expect(page.getByText(expected, { exact: false })).toBeVisible();
    if (locale !== 'en') await expect(page.getByText('(unknown)', { exact: false })).toHaveCount(0);
    await shot(page, `unpriced-unknown-${locale}`);
  });
}
