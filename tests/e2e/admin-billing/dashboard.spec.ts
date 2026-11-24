import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  GAMMA_NAME,
  OUT_DIR,
  PERIODS,
  TENANT,
  USERS,
  apiLogin,
  card,
  cardValue,
  dbActivity,
  dictionary,
  fixture,
  fixtureSums,
  fmt,
  openAdmin,
  orphanLabel,
  parseCsv,
  shot,
  sql,
  sqlInt,
  stub,
  stubLog,
  tableRows,
  totalRow,
} from './helpers';

const NA = '—';
const fx = fixture('this_month');
const fxTenant = (id: string | null, f = fx) => f.tenants.find((t) => t.tenant_id === id);
const EN = dictionary('en');

/** The product's documented cost rule (2 decimals; 0 < n < 0.01 -> up to 4 decimals; < 0.00005 -> "<$0.0001"). */
async function money(page: Page, n: number, locale = 'en'): Promise<string> {
  return page.evaluate(
    ([v, loc]) => {
      const d = (x: number, min: number, max: number) => new Intl.NumberFormat(loc as string, { minimumFractionDigits: min, maximumFractionDigits: max }).format(x);
      const x = v as number;
      if (x > 0 && x < 0.01) return x < 0.00005 ? `<$${d(0.0001, 4, 4)}` : `$${d(x, 2, 4)}`;
      return `$${d(x, 2, 2)}`;
    },
    [n, locale] as const
  );
}

/** Expected table rows for "this month": SQL (CRM side) + fixture rows (AI side). */
function expectedRows(dict = EN, f = fx, period: { startUtc: string; endUtc: string } = PERIODS.thisMonth) {
  const act = dbActivity(period);
  const staff = (id: string) => ({
    total: sqlInt(`SELECT COUNT(*) FROM "crm_agent_User" WHERE "tenantId" = '${id}'`),
    active: sqlInt(`SELECT COUNT(*) FROM "crm_agent_User" WHERE "tenantId" = '${id}' AND "isActive"`),
  });
  const known = sql(`SELECT id, name, subscription FROM "crm_agent_Tenant"`)
    .split('\n')
    .map((l) => {
      const [id, name, plan] = l.split('|');
      const ai = fxTenant(id, f);
      return { id: id as string | null, label: name, plan: plan as string | null, staff: staff(id) as { total: number; active: number } | null, a: act.get(id),
        tokens: ai ? ai.input_tokens + ai.output_tokens : 0, cost: ai ? ai.cost_usd : 0, unpriced: ai ? ai.unpriced_count : 0 };
    });
  const knownIds = new Set(known.map((k) => k.id));
  const orphans = f.tenants
    .filter((t) => t.tenant_id === null || !knownIds.has(t.tenant_id))
    .map((t) => ({ id: t.tenant_id, label: orphanLabel(dict, t.tenant_id), plan: null as string | null, staff: null as { total: number; active: number } | null,
      a: { active: 0, sessions: 0, messages: 0, handoffs: 0 }, tokens: t.input_tokens + t.output_tokens, cost: t.cost_usd, unpriced: t.unpriced_count }));
  return { rows: known.concat(orphans), act };
}

async function loginAndOpen(page: Page, locale = 'en') {
  await apiLogin(page, USERS.superAdmin);
  await openAdmin(page, locale);
}

async function applyCustom(page: Page, from: string, to: string) {
  if (!(await page.locator('#admin-period-from').isVisible())) await page.getByRole('button', { name: 'Custom' }).click();
  await page.locator('#admin-period-from').fill(from);
  await page.locator('#admin-period-to').fill(to);
  const resp = page.waitForResponse((r) => r.url().includes(`/api/admin/overview?from=${from}&to=${to}`));
  await page.getByRole('button', { name: 'Apply' }).click();
  expect((await resp).status()).toBe(200);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

test.describe('SUPER_ADMIN billing dashboard (proxy OK)', () => {
  test.beforeEach(async ({ request }) => stub(request, 'reset'));

  test('summary cards match seeded DB + stub totals; stub receives from/to/tz + internal key', async ({ page, request }) => {
    await loginAndOpen(page);
    const sums = fixtureSums(fx);
    const act = dbActivity(PERIODS.thisMonth);
    const tenants = sqlInt(`SELECT COUNT(*) FROM "crm_agent_Tenant"`);
    const aiOn = sqlInt(`SELECT COUNT(*) FROM "crm_agent_Tenant" WHERE "aiEnabled"`);
    const staffTotal = sqlInt(`SELECT COUNT(*) FROM "crm_agent_User"`);
    const staffActive = sqlInt(`SELECT COUNT(*) FROM "crm_agent_User" WHERE "isActive"`);
    const newProfiles = sqlInt(
      `SELECT COUNT(*) FROM "crm_agent_VisitorProfile" WHERE "createdAt" >= '${PERIODS.thisMonth.startUtc}' AND "createdAt" < '${PERIODS.thisMonth.endUtc}'`
    );
    expect(act.platformActive).toBe(8);

    const i = await fmt(page, 'en', { tenants, aiOn, staffTotal, staffActive, active: act.platformActive, newProfiles, req: sums.requests, err: sums.errors }, 'int');
    const tk = await fmt(page, 'en', { total: sums.tokens, input: sums.input, output: sums.output }, 'tokens');

    expect(await cardValue(page, 'Tenants')).toBe(`${i.tenants} (${i.aiOn} AI on)`);
    await expect(card(page, 'Tenants')).toContainText('pro 2');
    await expect(card(page, 'Tenants')).toContainText('free 2');
    expect(await cardValue(page, 'Staff accounts')).toBe(`${i.staffTotal} (${i.staffActive} active)`);
    for (const s of ['SA 1', 'BP 3', 'AG 3']) await expect(card(page, 'Staff accounts')).toContainText(s);
    expect(await cardValue(page, 'Active users')).toBe(i.active);
    await expect(card(page, 'Active users')).toContainText(`+${i.newProfiles} new profiles`);
    expect(await cardValue(page, 'Total tokens')).toBe(tk.total);
    await expect(card(page, 'Total tokens')).toContainText(`in ${tk.input} · out ${tk.output}`);
    // Cost card now carries the unpriced `*` (visible) + an sr-only hint
    expect(await cardValue(page, 'Estimated AI cost')).toBe(`${await money(page, sums.cost)} *`);
    await expect(card(page, 'Estimated AI cost').locator('p').first().locator('.sr-only')).toHaveText(`, ${sums.unpriced} calls without a price — cost not included`);
    await expect(card(page, 'Estimated AI cost')).toContainText(`${i.req} requests · ${i.err} errors`);

    expect(fx.totals.total_tokens).toBe(sums.tokens);
    expect(fx.totals.cost_usd).toBeCloseTo(sums.cost, 6);
    const log = await stubLog(request);
    expect(log.length).toBeGreaterThanOrEqual(1);
    for (const e of log) {
      expect(e.query).toEqual({ from: '2026-11-01', to: '2026-11-30', tz: 'Asia/Jakarta' });
      expect(e.internalKey).toBe('e2e-internal-key');
    }
    await shot(page, 'cards-this-month');
  });

  test('tenant table: localized orphan labels, cost-desc order, unpriced marker + banner, TOTAL = sum', async ({ page }) => {
    await loginAndOpen(page);
    const { rows: expected, act } = expectedRows();
    const order = [...expected].sort((a, b) => b.cost - a.cost);
    const rows = await tableRows(page);
    expect(rows.length).toBe(6);
    for (let idx = 0; idx < order.length; idx++) {
      const exp = order[idx];
      const r = rows[idx];
      const tk = await fmt(page, 'en', { v: exp.tokens }, 'tokens');
      expect(r[1]).toBe(exp.label);
      expect(r[2]).toBe(exp.plan ?? NA);
      expect(r[3]).toBe(exp.staff ? `${exp.staff.active}/${exp.staff.total}` : NA);
      expect(r[4]).toBe(String(exp.a.active));
      expect(r[5]).toBe(String(exp.a.sessions));
      expect(r[6]).toBe(String(exp.a.messages));
      expect(r[7]).toBe(tk.v);
      const m = await money(page, exp.cost);
      expect(r[8]).toBe(exp.unpriced > 0 ? `${m} *` : m);
    }
    expect(rows.map((r) => r[1])).toEqual(['PT Alpha', GAMMA_NAME, 'PT Beta', 'Unknown tenant (eeeeeeee)', 'No tenant', 'PT Delta']);
    // No-tenant row costs $0.00008: shown non-zero
    expect(rows[4][8]).toBe('$0.0001');

    const betaCost = page.locator('table tbody tr', { hasText: 'PT Beta' }).locator('td').nth(8);
    const hint = `${fxTenant(TENANT.beta)!.unpriced_count} calls without a price — cost not included`;
    await expect(betaCost).toHaveAttribute('title', hint);
    await expect(betaCost.locator('.sr-only')).toHaveText(`, ${hint}`);
    const banner = page.getByText(/calls without a price — cost not included in the totals\./);
    await expect(banner).toContainText(`${fx.totals.unpriced_count} calls without a price`);
    await expect(banner).toContainText('Models: (unknown), gpt-x-unpriced');

    const sumTokens = expected.reduce((a, r) => a + r.tokens, 0);
    const sumCost = expected.reduce((a, r) => a + r.cost, 0);
    const tk = await fmt(page, 'en', { v: sumTokens }, 'tokens');
    const staffActive = expected.reduce((a, r) => a + (r.staff?.active ?? 0), 0);
    const staffTotal = expected.reduce((a, r) => a + (r.staff?.total ?? 0), 0);
    const tot = await totalRow(page);
    expect(tot[1]).toBe('TOTAL');
    expect(tot[3]).toBe(`${staffActive}/${staffTotal} †`);
    expect(tot[4]).toBe(String(act.sum('active')));
    expect(tot[5]).toBe(String(act.sum('sessions')));
    expect(tot[6]).toBe(String(act.sum('messages')));
    expect(tot[7]).toBe(tk.v);
    expect(tot[8]).toBe(`${await money(page, sumCost)} *`);
    expect(sumTokens).toBe(fx.totals.total_tokens);

    await page.getByRole('button', { name: 'Sort by Cost' }).click();
    const asc = (await tableRows(page)).map((r) => r[8].replace(' *', ''));
    const ascExp: string[] = [];
    for (const e of [...expected].sort((a, b) => a.cost - b.cost)) ascExp.push(await money(page, e.cost));
    expect(asc).toEqual(ascExp);
    // Name sort now uses the localized label
    await page.getByRole('button', { name: 'Sort by Tenant' }).click();
    const names = (await tableRows(page)).map((r) => r[1]);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(names).toEqual([GAMMA_NAME, 'No tenant', 'PT Alpha', 'PT Beta', 'PT Delta', 'Unknown tenant (eeeeeeee)']);
    await shot(page, 'table-this-month');

    await page.getByRole('button', { name: 'PT Alpha' }).click();
    await expect(page.locator('table tbody tr.bg-slate-50')).toContainText('llm_complete');
    await expect(page.locator('table tbody tr.bg-slate-50')).toContainText('text-embedding-3-small');
  });

  test('search finds orphan rows by their localized label (/en "unknown", "no tenant")', async ({ page }) => {
    await loginAndOpen(page);
    const search = page.getByRole('searchbox');
    await search.fill('unknown');
    expect((await tableRows(page)).map((r) => r[1])).toEqual(['Unknown tenant (eeeeeeee)']);
    await search.fill('no tenant');
    expect((await tableRows(page)).map((r) => r[1])).toEqual(['No tenant']);
    await search.fill('eeeeeeee');
    expect((await tableRows(page)).map((r) => r[1])).toEqual(['Unknown tenant (eeeeeeee)']);
  });

  test('active users include the reused-session contact and exclude bot-only activity', async ({ page }) => {
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_ChatSession" WHERE id='s-a1-reused' AND "createdAt" < '${PERIODS.thisMonth.startUtc}'`)).toBe(1);
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_ChatSession" WHERE "contactId"='c-a1'`)).toBe(1);
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_Message" WHERE "sessionId"='s-a1-reused' AND "senderType"='user' AND "createdAt" >= '${PERIODS.thisMonth.startUtc}'`)).toBe(1);
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_Message" WHERE "sessionId"='s-a3-botonly' AND "senderType"<>'bot'`)).toBe(0);
    const anyMsgContacts = sqlInt(`SELECT COUNT(DISTINCT s."contactId") FROM "crm_agent_Message" m JOIN "crm_agent_ChatSession" s ON s.id=m."sessionId"
      WHERE s."tenantId"='${TENANT.alpha}' AND m."createdAt" >= '${PERIODS.thisMonth.startUtc}' AND m."createdAt" < '${PERIODS.thisMonth.endUtc}'`);
    const sessionsCreatedInPeriod = sqlInt(`SELECT COUNT(DISTINCT "contactId") FROM "crm_agent_ChatSession"
      WHERE "tenantId"='${TENANT.alpha}' AND "createdAt" >= '${PERIODS.thisMonth.startUtc}' AND "createdAt" < '${PERIODS.thisMonth.endUtc}'`);
    expect(anyMsgContacts).toBe(5);
    expect(sessionsCreatedInPeriod).toBe(3);

    await loginAndOpen(page);
    const alpha = (await tableRows(page)).find((r) => r[1] === 'PT Alpha')!;
    expect(alpha[4]).toBe('4');
    expect(await cardValue(page, 'Active users')).toBe('8');
  });

  test('handoffs = sessions with an agent message in the period (flag-only and out-of-period do not count)', async ({ page }) => {
    // Seed facts
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_ChatSession" WHERE id='s-b1-handoff' AND "handoffRequested"`)).toBe(1);
    expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_Message" WHERE "sessionId"='s-b1-handoff' AND "senderType"='agent'`)).toBe(0);
    const act = dbActivity(PERIODS.thisMonth);
    expect([act.get(TENANT.alpha).handoffs, act.get(TENANT.beta).handoffs, act.get(TENANT.gamma).handoffs]).toEqual([2, 0, 1]);
    const flagBased = sqlInt(`SELECT COUNT(DISTINCT m."sessionId") FROM "crm_agent_Message" m JOIN "crm_agent_ChatSession" s ON s.id=m."sessionId"
      WHERE m."createdAt" >= '${PERIODS.thisMonth.startUtc}' AND m."createdAt" < '${PERIODS.thisMonth.endUtc}' AND s."handoffRequested"`);
    expect(flagBased).toBe(2); // old definition would give 2 (a2, b1); new one gives 3 (a2, a7, g1)

    await apiLogin(page, USERS.superAdmin);
    const api = await (await page.context().request.get('/api/admin/overview')).json();
    expect(api.platform.activity.handoffs).toBe(3);
    const byId = Object.fromEntries(api.tenants.map((t: { id: string; activity: { handoffs: number } }) => [t.id, t.activity.handoffs]));
    expect(byId[TENANT.alpha]).toBe(2); // s-a2 (agent msg in Nov) + s-a7 (agent msg exactly at Nov 1 00:00 WIB)
    expect(byId[TENANT.beta]).toBe(0); // s-b1 flag only; s-b3 agent msg exactly at Dec 1 00:00 WIB (excluded)
    expect(byId[TENANT.gamma]).toBe(1); // s-g1, handoffRequested=false
    expect(api.platform.activity.messagesBySender).toEqual({ user: 10, bot: 6, agent: 3 });

    const oct = await (await page.context().request.get('/api/admin/overview?from=2026-10-01&to=2026-10-31')).json();
    expect(oct.platform.activity.handoffs).toBe(1); // s-b5 agent msg on Oct 2
    expect(oct.platform.activity.handoffs).toBe(dbActivity(PERIODS.lastMonth).sum('handoffs'));
  });

  test('period presets + custom range hit the stub with the right from/to/tz', async ({ page, request }) => {
    await loginAndOpen(page);
    await expect(page.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true');

    await stub(request, 'reset');
    const resp = page.waitForResponse((r) => r.url().includes('/api/admin/overview?from=2026-10-01&to=2026-10-31'));
    await page.getByRole('button', { name: 'Last month' }).click();
    expect((await resp).status()).toBe(200);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    expect((await stubLog(request)).at(-1)!.query).toEqual({ from: '2026-10-01', to: '2026-10-31', tz: 'Asia/Jakarta' });
    const lm = fixture('last_month');
    expect(await cardValue(page, 'Active users')).toBe(String(dbActivity(PERIODS.lastMonth).platformActive));
    expect(await cardValue(page, 'Total tokens')).toBe((await fmt(page, 'en', { v: fixtureSums(lm).tokens }, 'tokens')).v);
    expect(await cardValue(page, 'Estimated AI cost')).toBe(await money(page, fixtureSums(lm).cost));
    await expect(page.getByRole('button', { name: 'Last month' })).toHaveAttribute('aria-pressed', 'true');

    await stub(request, 'reset');
    await applyCustom(page, PERIODS.custom.from, PERIODS.custom.to);
    expect((await stubLog(request)).at(-1)!.query).toEqual({ from: '2026-11-10', to: '2026-11-14', tz: 'Asia/Jakarta' });
    expect(await cardValue(page, 'Total tokens')).toBe((await fmt(page, 'en', { v: fixtureSums(fixture('custom')).tokens }, 'tokens')).v);
    expect(await cardValue(page, 'Active users')).toBe(String(dbActivity(PERIODS.custom).platformActive));
    await expect(page.locator('[role="list"] [role="listitem"]')).toHaveCount(5);
  });

  test('UI blocks invalid ranges before fetching (>400 days, reversed, empty); API returns error codes', async ({ page, request }) => {
    await loginAndOpen(page);
    await stub(request, 'reset');
    const overviewCalls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/admin/overview')) overviewCalls.push(r.url()); });

    await page.getByRole('button', { name: 'Custom' }).click();
    const from = page.locator('#admin-period-from');
    const to = page.locator('#admin-period-to');
    const apply = page.getByRole('button', { name: 'Apply' });
    const err = page.locator('#admin-period-error');

    await from.fill('2025-10-26'); // 401 days inclusive
    await to.fill('2026-11-30');
    await expect(apply).toBeDisabled();
    await expect(err).toHaveText('The period can be at most 400 days');
    await shot(page, 'period-over-400-days');
    await from.fill('2025-10-27'); // exactly 400 days
    await expect(apply).toBeEnabled();
    await expect(err).toHaveCount(0);

    await from.fill('2026-11-20');
    await to.fill('2026-11-10');
    await expect(apply).toBeDisabled();
    await expect(err).toHaveText('The start date must not be after the end date');

    await from.fill('');
    await expect(apply).toBeDisabled();
    await expect(err).toHaveText('Select both a start and an end date');
    await apply.click({ force: true }).catch(() => undefined);
    expect(overviewCalls).toEqual([]);
    expect((await stubLog(request)).length).toBe(0);
    await expect(page.getByText(/HTTP \d{3}/)).toHaveCount(0);

    const api = page.context().request;
    const code = async (qs: string) => {
      const res = await api.get(`/api/admin/overview${qs}`);
      return [res.status(), (await res.json())?.error?.code ?? null];
    };
    expect(await code('?from=2025-10-27&to=2026-11-30')).toEqual([200, null]);
    expect(await code('?from=2025-10-26&to=2026-11-30')).toEqual([400, 'period_too_long']);
    expect(await code('?from=2026-11-30&to=2026-11-01')).toEqual([400, 'period_order']);
    expect(await code('?from=2026-11-01')).toEqual([400, 'period_incomplete']);
    expect(await code('?from=2026-02-30&to=2026-03-01')).toEqual([400, 'period_invalid']);
    const body = await (await api.get('/api/admin/overview?from=2025-10-26&to=2026-11-30')).json();
    expect(body).toEqual({ error: { code: 'period_too_long', message: expect.any(String) } });
  });

  test('id locale: client validation message is localized', async ({ page }) => {
    await loginAndOpen(page, 'id');
    const ID = dictionary('id');
    await page.getByRole('button', { name: ID.admin.periodCustom }).click();
    await page.locator('#admin-period-from').fill('2025-01-01');
    await page.locator('#admin-period-to').fill('2026-11-30');
    await expect(page.locator('#admin-period-error')).toHaveText(ID.admin.errPeriodTooLong.replace('{max}', '400'));
    await expect(page.getByRole('button', { name: ID.admin.apply })).toBeDisabled();
  });

  test('retention banner when the period starts before the oldest retained trace', async ({ page }) => {
    await loginAndOpen(page);
    await applyCustom(page, '2025-10-01', '2025-10-31');
    const oldest = fixture('retention') as unknown as { retention: { oldest_available: string } };
    const date = await page.evaluate((iso) => new Date(iso).toLocaleDateString('en', { timeZone: 'Asia/Jakarta' }), oldest.retention.oldest_available);
    await expect(page.getByText(`Token data is available since ${date}`)).toBeVisible();
  });

  test('trend chart renders every day of the month (gap-filled, daily up to 62 days)', async ({ page }) => {
    await loginAndOpen(page);
    const bars = page.locator('[role="list"] [role="listitem"]');
    await expect(bars).toHaveCount(30);
    await expect(page.getByText('Weekly totals')).toHaveCount(0);
    expect(fx.by_day.length).toBeLessThan(30);
    const heights = await bars.evaluateAll((els) => els.map((e) => (e.firstElementChild as HTMLElement).style.height));
    expect(heights.filter((h) => h !== '0%').length).toBe(fx.by_day.length);
    const titles = await bars.evaluateAll((els) => els.map((e) => e.getAttribute('title')!.split('\n')[0]));
    expect(titles[0]).toBe('2026-11-01');
    expect(titles[29]).toBe('2026-11-30');
    expect(await bars.nth(19).getAttribute('title')).toContain('0 tokens');
  });

  for (const width of [1440, 390]) {
    test(`long range (>62 days) uses weekly buckets whose totals equal the daily sums @${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginAndOpen(page);
      await applyCustom(page, PERIODS.long.from, PERIODS.long.to);
      const lf = fixture('long');
      // Dense daily series, then 7-day buckets counted from the first day
      const daily = new Map(lf.by_day.map((d) => [d.date, d.total_tokens]));
      const days: string[] = [];
      for (let t = Date.UTC(2026, 7, 1); t <= Date.UTC(2026, 10, 30); t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10));
      expect(days.length).toBe(122);
      const buckets: Array<{ from: string; to: string; tokens: number; n: number }> = [];
      for (let k = 0; k < days.length; k += 7) {
        const chunk = days.slice(k, k + 7);
        buckets.push({ from: chunk[0], to: chunk[chunk.length - 1], tokens: chunk.reduce((s, d) => s + (daily.get(d) ?? 0), 0), n: chunk.length });
      }
      expect(buckets.reduce((s, b) => s + b.tokens, 0)).toBe(lf.totals.total_tokens);

      await expect(page.getByText('Weekly totals')).toBeVisible();
      const bars = page.locator('[role="list"] [role="listitem"]');
      await expect(bars).toHaveCount(buckets.length); // 18
      const tips = await bars.evaluateAll((els) => els.map((e) => e.getAttribute('title')!));
      for (let k = 0; k < buckets.length; k++) {
        const b = buckets[k];
        const tk = (await fmt(page, 'en', { v: b.tokens }, 'tokens')).v;
        const head = b.n < 7 ? `${b.from} – ${b.to} (${b.n} days)` : `${b.from} – ${b.to}`;
        expect(tips[k].split('\n')[0]).toBe(head);
        expect(tips[k].split('\n')[1]).toContain(`${tk} tokens`);
      }
      const geo = await page.locator('[role="list"]').evaluate((l) => ({
        scroll: l.scrollWidth,
        client: l.clientWidth,
        minBar: Math.min(...Array.from(l.children).map((c) => (c.firstElementChild as HTMLElement).getBoundingClientRect().width)),
        right: l.getBoundingClientRect().right,
      }));
      expect(geo.scroll).toBeLessThanOrEqual(geo.client);
      expect(geo.minBar).toBeGreaterThanOrEqual(2);
      expect(geo.right).toBeLessThanOrEqual(width);
      // page-level overflow is asserted in mobile.spec.ts (sr-only hint bug); here: the chart itself fits
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'document h-scroll').toBe(true);
      await shot(page, `chart-weekly-${width}`);
    });
  }

  test('sub-cent cost (0.004) is non-zero in card, table and chart; CSV keeps 6 decimals', async ({ page }) => {
    await loginAndOpen(page);
    await applyCustom(page, PERIODS.subcent.from, PERIODS.subcent.to);
    const sc = fixture('subcent');
    expect(sc.tenants.length).toBe(1);
    expect(sc.tenants[0].tenant_id).toBe(TENANT.beta);
    expect(sc.tenants[0].cost_usd).toBeCloseTo(0.004, 9);
    expect(await cardValue(page, 'Estimated AI cost')).toBe('$0.004');
    const beta = (await tableRows(page)).find((r) => r[1] === 'PT Beta')!;
    expect(beta[8]).toBe('$0.004');
    expect((await totalRow(page))[8]).toBe('$0.004');
    const bar = page.locator('[role="list"] [role="listitem"]');
    await expect(bar).toHaveCount(1);
    expect(await bar.getAttribute('title')).toContain('$0.004');
    await shot(page, 'subcent');

    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    const saved = path.join(OUT_DIR, 'downloads', dl.suggestedFilename());
    fs.mkdirSync(path.dirname(saved), { recursive: true });
    await dl.saveAs(saved);
    const rows = parseCsv(fs.readFileSync(saved).subarray(3).toString('utf8'));
    const b = rows.find((r) => r[0] === TENANT.beta)!;
    expect(b[rows[0].indexOf('cost_usd')]).toBe('0.004000');
  });

  for (const locale of ['en', 'id'] as const) {
    test(`CSV export (${locale}): BOM, CRLF, 17 columns, formula guard, tenant_name = displayed label`, async ({ page }) => {
      await loginAndOpen(page, locale);
      const dict = dictionary(locale);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: dict.admin.exportCsv }).click()]);
      expect(dl.suggestedFilename()).toBe('billing_2026-11-01_2026-11-30.csv');
      const saved = path.join(OUT_DIR, 'downloads', `${locale}-${dl.suggestedFilename()}`);
      fs.mkdirSync(path.dirname(saved), { recursive: true });
      await dl.saveAs(saved);
      const buf = fs.readFileSync(saved);
      expect(Array.from(buf.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      const text = buf.subarray(3).toString('utf8');
      expect(text).toContain('\r\n');
      expect(text.replace(/\r\n/g, '')).not.toMatch(/\n/);
      const rows = parseCsv(text);
      const header = rows[0];
      expect(header).toEqual([
        'tenant_id', 'tenant_name', 'plan', 'period_from', 'period_to', 'staff_total', 'staff_active', 'end_users_active',
        'sessions', 'messages', 'input_tokens', 'cached_input_tokens', 'output_tokens', 'total_tokens', 'requests', 'cost_usd', 'unpriced_requests',
      ]);
      const data = rows.slice(1);
      expect(data.length).toBe(6);
      const col = (name: string) => header.indexOf(name);

      const g = data.find((r) => r[0] === TENANT.gamma)!;
      expect(g[col('tenant_name')]).toBe(`'${GAMMA_NAME}`);
      expect(text).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`);
      for (const r of data) for (const i of [0, 1, 2]) expect(r[i]).not.toMatch(/^[=+\-@\t\r]/);

      // tenant_name is exactly the label the table displays (orphans localized)
      const displayed = (await tableRows(page)).map((r) => r[1]).sort();
      const exported = data.map((r) => r[1].replace(/^'/, '')).sort();
      expect(exported).toEqual(displayed);
      expect(data.find((r) => r[0] === TENANT.unknown)![1]).toBe(orphanLabel(dict, TENANT.unknown));
      expect(data.find((r) => r[0] === '')![1]).toBe(orphanLabel(dict, null));

      const table = new Map((await tableRows(page)).map((r) => [r[1], r]));
      for (const r of data) {
        const id = r[0] === '' ? null : r[0];
        const ai = fxTenant(id);
        const tokens = ai ? ai.input_tokens + ai.output_tokens : 0;
        expect(Number(r[col('total_tokens')])).toBe(tokens);
        expect(Number(r[col('requests')])).toBe(ai ? ai.request_count : 0);
        expect(r[col('cost_usd')]).toBe((ai ? ai.cost_usd : 0).toFixed(6));
        expect(Number(r[col('unpriced_requests')])).toBe(ai ? ai.unpriced_count : 0);
        const t = table.get(r[1].replace(/^'/, ''))!;
        expect(t[4]).toBe(r[col('end_users_active')]);
        expect(t[5]).toBe(r[col('sessions')]);
        expect(t[6]).toBe(r[col('messages')]);
      }
    });
  }

  test('refetch keeps search, sort and expanded rows (data stays mounted while loading)', async ({ page, request }) => {
    await loginAndOpen(page);
    await page.getByRole('searchbox').fill('pt');
    await page.getByRole('button', { name: 'Sort by Tenant' }).click();
    await page.getByRole('button', { name: 'PT Beta' }).click();
    await expect(page.locator('table tbody tr.bg-slate-50')).toHaveCount(1);
    const before = (await tableRows(page)).map((r) => r[1]);
    expect(before).toEqual(['PT Alpha', 'PT Beta', 'PT Delta']);

    await stub(request, 'slow'); // proxy answers after 3 s: observe the page mid-refetch
    await page.getByRole('button', { name: 'Last month' }).click();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toHaveCount(0); // no skeleton swap
    await shot(page, 'refetch-in-flight');
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });

    await expect(page.getByRole('searchbox')).toHaveValue('pt');
    await expect(page.getByRole('button', { name: 'Sort by Tenant' })).toHaveClass(/(^|\s)text-slate-900(\s|$)/);
    await expect(page.getByRole('button', { name: 'Sort by Cost' })).not.toHaveClass(/(^|\s)text-slate-900(\s|$)/);
    expect((await tableRows(page)).map((r) => r[1])).toEqual(['PT Alpha', 'PT Beta', 'PT Delta']);
    await expect(page.getByRole('button', { name: 'PT Beta' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('table tbody tr.bg-slate-50')).toHaveCount(1);
    // and the data really changed to last month
    expect(await cardValue(page, 'Active users')).toBe(String(dbActivity(PERIODS.lastMonth).platformActive));
  });

  for (const locale of ['en', 'id', 'ko'] as const) {
    test(`locale /${locale}/admin has no raw translation keys and localized orphan labels`, async ({ page }) => {
      await loginAndOpen(page, locale);
      const dict = dictionary(locale);
      const keys = Object.keys(dict.admin).filter((k) => /[A-Z]/.test(k));
      const text = await page.locator('body').innerText();
      for (const k of keys) expect(text, `raw key "${k}" visible`).not.toContain(k);
      expect(text).not.toMatch(/\badmin\.[a-zA-Z]+/);
      await expect(page.getByRole('heading', { name: dict.admin.title })).toBeVisible();
      for (const k of ['cardTenants', 'cardStaff', 'cardTokens', 'cardCost', 'trendTitle', 'exportCsv']) expect(text).toContain(dict.admin[k]);
      const labels = (await tableRows(page)).map((r) => r[1]);
      expect(labels).toContain(orphanLabel(dict, TENANT.unknown));
      expect(labels).toContain(orphanLabel(dict, null));
      await shot(page, `locale-${locale}`);
    });
  }
});
