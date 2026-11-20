import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { OUT_DIR, USERS, apiLogin, stub } from './helpers';

// Records sidebar geometry + screenshots at 1280px. Run against the new HEAD and against an old revision
// (LAYOUT_TAG=old|new) and compare the JSON/PNGs. Works on any revision (no new selectors needed).
const TAG = process.env.LAYOUT_TAG || 'new';

for (const p of ['/en/admin', '/en/dashboard']) {
  test(`layout 1280 ${p} [${TAG}]`, async ({ page, request }) => {
    await stub(request, 'reset');
    await page.setViewportSize({ width: 1280, height: 800 });
    await apiLogin(page, USERS.superAdmin);
    await page.goto(p);
    await page.locator('nav a[href$="/admin"]').waitFor({ timeout: 60_000 });
    await page.waitForLoadState('networkidle');
    if (p.endsWith('admin')) await page.locator('table tfoot').waitFor({ timeout: 60_000 });
    const geo = await page.evaluate(() => {
      const nav = document.querySelector('nav')!;
      const side = nav.parentElement as HTMLElement;
      const r = (e: Element) => {
        const b = e.getBoundingClientRect();
        return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
      };
      const cs = getComputedStyle(side);
      return {
        sidebar: r(side),
        sidebarBg: cs.backgroundColor,
        sidebarPosition: cs.position,
        brand: r(side.firstElementChild!),
        links: Array.from(nav.querySelectorAll('a')).map((a) => ({ href: a.getAttribute('href'), box: r(a), text: (a as HTMLElement).innerText })),
        header: r(document.querySelector('header')!),
        headerChildren: Array.from(document.querySelector('header')!.children).map((c) => r(c)),
        main: r(document.querySelector('main') ?? document.querySelector('header')!.parentElement!),
      };
    });
    const dir = path.join(OUT_DIR, 'layout-1280');
    fs.mkdirSync(dir, { recursive: true });
    const name = p.replace(/\//g, '_');
    fs.writeFileSync(path.join(dir, `${TAG}${name}.json`), JSON.stringify(geo, null, 1));
    await page.screenshot({ path: path.join(dir, `${TAG}${name}.png`) });
    await page.screenshot({ path: path.join(dir, `${TAG}${name}-sidebar.png`), clip: { x: 0, y: 0, width: 256, height: 800 } });
  });
}
