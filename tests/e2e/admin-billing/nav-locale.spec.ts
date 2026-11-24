import { test, expect, type Page, type Request, type Response } from '@playwright/test';
import { USERS, apiLogin, dictionary, shot, stub } from './helpers';

// Sidebar links keep the locale and navigate client-side (no middleware 307, no new document),
// and exactly the owning nav item is highlighted. Run at desktop (sidebar column) and in the 390px drawer.
const HREFS = ['/dashboard', '/inbox', '/visitors', '/agent', '/integration', '/settings', '/admin'];
const KEYS: Record<string, string> = {
  '/dashboard': 'overview', '/inbox': 'inbox', '/visitors': 'visitors', '/agent': 'agent',
  '/integration': 'integration', '/settings': 'settings', '/admin': 'admin',
};

async function activeHrefs(page: Page) {
  return page.locator('#dashboard-sidebar nav a').evaluateAll((as) =>
    as.filter((a) => /(^|\s)bg-brand(\s|$)/.test(a.className)).map((a) => a.getAttribute('href'))
  );
}

for (const locale of ['id', 'ko'] as const) {
  for (const width of [1280, 390]) {
    test(`/${locale} @${width}px: every sidebar link keeps the locale, is client-side, highlights only itself`, async ({ page, request }) => {
      test.setTimeout(240_000);
      await stub(request, 'reset');
      const dict = dictionary(locale);
      await page.setViewportSize({ width, height: 800 });
      await apiLogin(page, USERS.superAdmin);
      await page.goto(`/${locale}/admin`);
      await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });

      // /admin highlights Admin only (not the dashboard root); breadcrumb follows
      expect(await activeHrefs(page)).toEqual([`/${locale}/admin`]);
      await expect(page.locator('header').getByText(dict.sidebar.admin, { exact: true })).toBeVisible();

      const hrefsInNav = await page.locator('#dashboard-sidebar nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(hrefsInNav).toEqual(HREFS.map((h) => `/${locale}${h}`));

      await page.evaluate(() => ((window as unknown as Record<string, string>).__e2eMarker = 'kept'));
      const redirects: string[] = [];
      const docs: string[] = [];
      page.on('response', (r: Response) => { if ([301, 302, 303, 307, 308].includes(r.status())) redirects.push(`${r.status()} ${r.url()}`); });
      page.on('request', (r: Request) => { if (r.resourceType() === 'document') docs.push(r.url()); });

      // visit every item, ending on /admin again
      for (const href of [...HREFS.filter((h) => h !== '/admin'), '/admin']) {
        if (width < 768) await page.locator('header button[aria-controls="dashboard-sidebar"]').click();
        await page.locator(`#dashboard-sidebar nav a[href="/${locale}${href}"]`).click();
        await page.waitForURL((u) => u.pathname === `/${locale}${href}`, { timeout: 60_000 });
        await expect.poll(() => activeHrefs(page), { timeout: 30_000 }).toEqual([`/${locale}${href}`]);
        expect(await page.evaluate(() => document.documentElement.lang), `${href} html lang`).toBe(locale);
        expect(await page.evaluate(() => (window as unknown as Record<string, string>).__e2eMarker), `${href} client-side`).toBe('kept');
        await expect(page.locator('header').getByText(dict.sidebar[KEYS[href]], { exact: true }), `${href} breadcrumb`).toBeVisible();
      }
      await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
      await shot(page, `nav-${locale}-${width}-admin-active`);
      expect(redirects, 'no 3xx while navigating the sidebar').toEqual([]);
      expect(docs, 'no full document loads').toEqual([]);
    });
  }
}
