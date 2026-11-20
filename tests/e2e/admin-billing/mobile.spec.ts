import { test, expect, type Page } from '@playwright/test';
import { USERS, apiLogin, dictionary, openAdmin, shot, stub } from './helpers';

const hamburger = (page: Page) => page.locator('header button[aria-controls="dashboard-sidebar"]');
const sidebar = (page: Page) => page.locator('#dashboard-sidebar');

async function noHorizontalScroll(page: Page) {
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  test.info().annotations.push({ type: 'scroll-metrics', description: JSON.stringify(m) });
  if (m.doc > m.client) {
    // Name every element that sticks out past the viewport and is NOT clipped by an overflow ancestor
    const offenders = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out: Array<Record<string, unknown>> = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1) continue;
        const cs = getComputedStyle(el);
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
        let positioned: Element | null = el.parentElement;
        while (positioned && getComputedStyle(positioned).position === 'static') positioned = positioned.parentElement;
        const td = el.closest('td');
        out.push({
          tag: el.tagName.toLowerCase(), cls: String((el as HTMLElement).className), text: (el.textContent ?? '').slice(0, 60),
          right: Math.round(r.right), section: td ? (td.closest('tfoot') ? 'tfoot' : 'tbody') : null,
          column: td ? Array.from(td.parentElement!.children).indexOf(td) : null,
          row: td ? (td.parentElement!.querySelector('td:nth-child(2)')?.textContent ?? '').slice(0, 30) : null,
          containingBlock: positioned ? positioned.tagName.toLowerCase() : 'initial containing block',
        });
      }
      return out;
    });
    test.info().annotations.push({ type: 'overflow-offenders', description: JSON.stringify(offenders) });
  }
  // soft: record the overflow but keep checking the rest of the mobile behaviour
  expect.soft(m.doc, `document scrollWidth ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.client);
  expect.soft(m.body, JSON.stringify(m)).toBeLessThanOrEqual(m.client);
  await page.evaluate(() => window.scrollTo(1000, 0));
  expect.soft(await page.evaluate(() => window.scrollX), 'page scrolls horizontally').toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function expectOpen(page: Page) {
  await expect(sidebar(page)).toBeVisible();
  await expect(sidebar(page)).toHaveAttribute('role', 'dialog');
  await expect(sidebar(page)).toHaveAttribute('aria-modal', 'true');
  await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'true');
  // focus moved into the drawer
  expect(await page.evaluate(() => !!document.activeElement?.closest('#dashboard-sidebar'))).toBe(true);
  // main is inert behind it
  expect(await page.evaluate(() => !!document.querySelector('main')?.closest('[inert]'))).toBe(true);
  // drawer fully on screen once the 200 ms slide-in finished
  await expect.poll(async () => (await sidebar(page).boundingBox())!.x).toBe(0);
}

async function expectClosed(page: Page, focusBack = true) {
  await expect(sidebar(page)).toBeHidden();
  await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => !!document.querySelector('main')?.closest('[inert]'))).toBe(false);
  if (focusBack) {
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-controls'))).toBe('dashboard-sidebar');
  }
}

test.describe('mobile layout + drawer', () => {
  test.beforeEach(async ({ request }) => stub(request, 'reset'));

  for (const width of [390, 360]) {
    for (const locale of ['en', 'id', 'ko'] as const) {
      test(`/${locale}/admin @${width}px: no h-scroll, header fits, cards readable, drawer a11y`, async ({ page }) => {
        const dict = dictionary(locale);
        await page.setViewportSize({ width, height: 800 });
        await apiLogin(page, USERS.superAdmin);
        await openAdmin(page, locale);
        await noHorizontalScroll(page);

        // Header: hamburger, language switcher and avatar all fully inside the viewport, no overflow
        const header = await page.locator('header').evaluate((h) => {
          const r = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
          const buttons = Array.from(h.querySelectorAll('button'));
          const user = buttons[buttons.length - 1];
          return {
            scroll: h.scrollWidth,
            client: h.clientWidth,
            user: r(user),
            avatar: r(user?.querySelector('div.rounded-full') ?? null),
            lang: r(h.querySelector('select')?.parentElement ?? null),
            ham: r(h.querySelector('button[aria-controls]')),
          };
        });
        expect(header.scroll).toBeLessThanOrEqual(header.client);
        for (const k of ['user', 'avatar', 'lang', 'ham'] as const) {
          const b = header[k]!;
          expect(b, k).not.toBeNull();
          expect(b.left, `${k} left`).toBeGreaterThanOrEqual(0);
          expect(b.right, `${k} right`).toBeLessThanOrEqual(width);
          expect(b.width, `${k} width`).toBeGreaterThan(0);
        }
        await expect(hamburger(page)).toHaveAttribute('aria-label', dict.sidebar.openMenu);

        // Card values: fully visible (no truncation, inside viewport)
        const cards = await page.locator('h3').evaluateAll((hs) =>
          hs
            .map((h) => h.parentElement!.parentElement!.querySelector(':scope > p') as HTMLElement | null)
            .filter((p): p is HTMLElement => !!p)
            .map((p) => ({ text: p.textContent, sw: p.scrollWidth, cw: p.clientWidth, right: p.getBoundingClientRect().right }))
        );
        expect(cards.length).toBe(5);
        for (const c of cards) {
          expect(c.sw, `card "${c.text}"`).toBeLessThanOrEqual(c.cw);
          expect(c.right, `card "${c.text}"`).toBeLessThanOrEqual(width);
        }
        // Period buttons + Export reachable inside the viewport
        for (const name of [dict.admin.periodThisMonth, dict.admin.periodLastMonth, dict.admin.periodCustom, dict.admin.exportCsv]) {
          const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
          expect(b.x + b.width, name).toBeLessThanOrEqual(width);
        }
        await shot(page, `mobile-${locale}-${width}`);

        // Drawer closed initially
        await expect(sidebar(page)).toBeHidden();
        await expect(hamburger(page)).toBeVisible();

        // 1) open -> Escape
        await hamburger(page).click();
        await expectOpen(page);
        await expect(sidebar(page).locator(`nav a[href="/${locale}/admin"]`)).toHaveText(dict.sidebar.admin);
        await shot(page, `mobile-${locale}-${width}-drawer`);
        await page.keyboard.press('Escape');
        await expectClosed(page);

        // 2) open -> backdrop tap
        await hamburger(page).click();
        await expectOpen(page);
        await page.mouse.click(width - 15, 500);
        await expectClosed(page);

        // 3) open -> tap the current-page link: client-side navigation (window marker survives, no 3xx, no new document),
        //    locale kept, drawer closes and focus returns to the hamburger
        await page.evaluate(() => ((window as unknown as Record<string, string>).__e2eMarker = 'kept'));
        const redirects: string[] = [];
        const docs: string[] = [];
        const onResp = (r: import('@playwright/test').Response) => { if ([301, 302, 303, 307, 308].includes(r.status())) redirects.push(`${r.status()} ${r.url()}`); };
        const onReq = (r: import('@playwright/test').Request) => { if (r.resourceType() === 'document') docs.push(r.url()); };
        page.on('response', onResp);
        page.on('request', onReq);
        await hamburger(page).click();
        await expectOpen(page);
        await sidebar(page).locator(`nav a[href="/${locale}/admin"]`).click();
        await expectClosed(page);
        await page.waitForLoadState('networkidle');
        page.off('response', onResp);
        page.off('request', onReq);
        expect(new URL(page.url()).pathname).toBe(`/${locale}/admin`);
        expect(await page.evaluate(() => (window as unknown as Record<string, string>).__e2eMarker)).toBe('kept');
        expect(redirects, 'no redirect').toEqual([]);
        expect(docs, 'no full document load').toEqual([]);
        await expect(hamburger(page)).toHaveAttribute('aria-label', dict.sidebar.openMenu);

        // 4) open -> close (X) button
        await hamburger(page).click();
        await expectOpen(page);
        await sidebar(page).getByRole('button', { name: dict.sidebar.closeMenu }).click();
        await expectClosed(page);
        await noHorizontalScroll(page);
      });
    }
  }

  for (const width of [390, 1280]) {
    test(`another dashboard page (/en/dashboard) @${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await apiLogin(page, USERS.superAdmin);
      await page.goto('/en/dashboard');
      await expect(page.locator('header')).toBeVisible({ timeout: 60_000 });
      await page.waitForLoadState('networkidle');
      await shot(page, `dashboard-page-${width}`);
      const m = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      test.info().annotations.push({ type: 'scroll', description: JSON.stringify(m) });
      expect(m.doc).toBeLessThanOrEqual(m.client);
      if (width === 1280) {
        await expect(sidebar(page)).toBeVisible();
        await expect(hamburger(page)).toBeHidden();
        expect(await sidebar(page).getAttribute('role')).toBeNull();
        const box = (await sidebar(page).boundingBox())!;
        expect([box.x, box.width]).toEqual([0, 256]);
      } else {
        await expect(sidebar(page)).toBeHidden();
        await hamburger(page).click();
        await expectOpen(page);
        await page.keyboard.press('Escape');
        await expectClosed(page);
      }
    });
  }
});
