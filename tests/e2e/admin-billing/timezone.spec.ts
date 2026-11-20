import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { OUT_DIR, USERS, apiLogin, dbActivity, sql, sqlInt, stub } from './helpers';

// Activity counts via the REAL app/API must not depend on the CRM DB session TimeZone.
// Run once with the DB default TimeZone = UTC and once with Asia/Jakarta (ALTER DATABASE + restart the dev server),
// setting EXPECT_DB_TZ accordingly. Each run asserts against SQL with literal UTC bounds and saves a snapshot;
// the second run also asserts its snapshot equals the first one.
const EXPECT_DB_TZ = process.env.EXPECT_DB_TZ || 'UTC';

/** WIB calendar day d -> UTC [d-1 17:00, d 17:00) (hand-written, no tz library). */
const wibDay = (d: string) => {
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - 7 * 3600e3;
  const f = (x: number) => new Date(x).toISOString().replace('T', ' ').slice(0, 19);
  return { startUtc: f(t), endUtc: f(t + 86_400e3) };
};
const PERIODS: Record<string, { from: string; to: string; startUtc: string; endUtc: string }> = {
  this_month: { from: '2026-11-01', to: '2026-11-30', startUtc: '2026-10-31 17:00:00', endUtc: '2026-11-30 17:00:00' },
  last_month: { from: '2026-10-01', to: '2026-10-31', startUtc: '2026-09-30 17:00:00', endUtc: '2026-10-31 17:00:00' },
};
for (const d of ['2026-10-31', '2026-11-01', '2026-11-30', '2026-12-01']) PERIODS[`day_${d}`] = { from: d, to: d, ...wibDay(d) };

test('activity counts are identical and correct whatever the DB TimeZone', async ({ page, request }) => {
  await stub(request, 'reset');
  // A fresh session gets the database default: prove which TimeZone the app's (restarted) connections use.
  expect(sql(`SELECT current_setting('TimeZone')`).trim()).toBe(EXPECT_DB_TZ);
  await apiLogin(page, USERS.superAdmin);

  const snapshot: Record<string, unknown> = {};
  for (const [name, p] of Object.entries(PERIODS)) {
    const res = await page.context().request.get(`/api/admin/overview?from=${p.from}&to=${p.to}`);
    expect(res.status(), name).toBe(200);
    const api = await res.json();
    const act = dbActivity(p);
    const perTenant: Record<string, unknown> = {};
    for (const t of api.tenants.filter((x: { known: boolean }) => x.known)) {
      const e = act.get(t.id);
      expect([t.endUsers.activeInPeriod, t.activity.sessions, t.activity.messages, t.activity.handoffs], `${name} ${t.id}`).toEqual([
        e.active, e.sessions, e.messages, e.handoffs,
      ]);
      perTenant[t.id] = { active: t.endUsers.activeInPeriod, ...t.activity };
    }
    expect(api.platform.endUsers.activeInPeriod, name).toBe(act.platformActive);
    expect(api.platform.activity.messages, name).toBe(act.sum('messages'));
    expect(api.platform.activity.sessions, name).toBe(act.sum('sessions'));
    expect(api.platform.activity.handoffs, name).toBe(act.sum('handoffs'));
    const bySender = sql(`SELECT m."senderType", COUNT(*) FROM "crm_agent_Message" m WHERE m."createdAt" >= '${p.startUtc}' AND m."createdAt" < '${p.endUtc}' GROUP BY 1`)
      .split('\n').filter(Boolean).reduce<Record<string, number>>((a, l) => { const [k, v] = l.split('|'); a[k] = +v; return a; }, {});
    expect(api.platform.activity.messagesBySender, name).toEqual(bySender);
    snapshot[name] = { platform: { activeInPeriod: api.platform.endUsers.activeInPeriod, ...api.platform.activity }, perTenant };
  }

  // Edge rows (seed): start instant included, end instant excluded, WIB-midnight neighbours on the right day
  const s = snapshot as Record<string, { platform: { messages: number; messagesBySender: Record<string, number> } }>;
  const ids = (d: string) => sql(`SELECT id FROM "crm_agent_Message" WHERE "createdAt" >= '${PERIODS[d].startUtc}' AND "createdAt" < '${PERIODS[d].endUtc}' ORDER BY id`).split('\n');
  expect(ids('day_2026-11-01')).toEqual(expect.arrayContaining(['m14', 'm28'])); // exactly 2026-11-01 00:00 WIB
  expect(ids('day_2026-10-31')).toContain('m13'); // 23:59:59.999 WIB
  expect(ids('day_2026-10-31')).not.toContain('m14');
  expect(ids('day_2026-11-30')).toContain('m18'); // 23:59:59 WIB
  expect(ids('day_2026-11-30')).not.toContain('m19');
  expect(ids('day_2026-12-01')).toEqual(expect.arrayContaining(['m19', 'm27'])); // exactly 2026-12-01 00:00 WIB
  expect(s['day_2026-11-01'].platform.messages).toBe(ids('day_2026-11-01').length);
  expect(s['day_2026-10-31'].platform.messages).toBe(ids('day_2026-10-31').length);
  expect(s['day_2026-11-30'].platform.messages).toBe(ids('day_2026-11-30').length);
  expect(s['day_2026-12-01'].platform.messages).toBe(ids('day_2026-12-01').length);
  expect(s['day_2026-11-01'].platform.messagesBySender.agent).toBe(1); // m28 at the start instant counts
  expect(s['day_2026-12-01'].platform.messagesBySender.agent).toBe(1); // m27 belongs to Dec 1, not Nov 30
  expect(sqlInt(`SELECT COUNT(*) FROM "crm_agent_Message" WHERE "createdAt" = '2026-10-31 17:00:00'`)).toBe(2);

  const dir = path.join(OUT_DIR, 'tz');
  fs.mkdirSync(dir, { recursive: true });
  const mine = path.join(dir, `snapshot-${EXPECT_DB_TZ.replace('/', '_')}.json`);
  fs.writeFileSync(mine, JSON.stringify(snapshot, null, 1));
  const other = path.join(dir, `snapshot-${(EXPECT_DB_TZ === 'UTC' ? 'Asia/Jakarta' : 'UTC').replace('/', '_')}.json`);
  if (fs.existsSync(other)) {
    expect(snapshot).toEqual(JSON.parse(fs.readFileSync(other, 'utf8')));
    test.info().annotations.push({ type: 'compared-with', description: other });
  }
});
