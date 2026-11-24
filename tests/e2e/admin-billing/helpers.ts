import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const PASSWORD = 'E2e-Pass-123!';
export const USERS = {
  superAdmin: 'superadmin@billing-e2e.local',
  partner: 'partner@billing-e2e.local',
  agent: 'agent1@billing-e2e.local',
};
export const TENANT = {
  alpha: 'aaaaaaaa-0000-4000-8000-000000000001',
  beta: 'bbbbbbbb-0000-4000-8000-000000000002',
  gamma: 'cccccccc-0000-4000-8000-000000000003',
  delta: 'dddddddd-0000-4000-8000-000000000004',
  unknown: 'eeeeeeee-0000-4000-8000-000000000005',
};
export const GAMMA_NAME = '=HYPERLINK("http://evil.example","click")';

// Periods, with UTC bounds written by hand (Asia/Jakarta = UTC+7, no DST) — independent of product code.
export const PERIODS = {
  subcent: { from: '2026-11-25', to: '2026-11-25', startUtc: '2026-11-24 17:00', endUtc: '2026-11-25 17:00', fixture: 'subcent' },
  long: { from: '2026-08-01', to: '2026-11-30', startUtc: '2026-07-31 17:00', endUtc: '2026-11-30 17:00', fixture: 'long' },
  thisMonth: { from: '2026-11-01', to: '2026-11-30', startUtc: '2026-10-31 17:00', endUtc: '2026-11-30 17:00', fixture: 'this_month' },
  lastMonth: { from: '2026-10-01', to: '2026-10-31', startUtc: '2026-09-30 17:00', endUtc: '2026-10-31 17:00', fixture: 'last_month' },
  custom: { from: '2026-11-10', to: '2026-11-14', startUtc: '2026-11-09 17:00', endUtc: '2026-11-14 17:00', fixture: 'custom' },
} as const;
export type PeriodKey = keyof typeof PERIODS;

export const OUT_DIR = process.env.BILLING_E2E_OUT || path.join(os.tmpdir(), 'billing-e2e-artifacts');
export const SHOTS = path.join(OUT_DIR, 'screenshots');
export const STUB = process.env.STUB_URL || 'http://127.0.0.1:8210';

export async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(SHOTS, { recursive: true });
  const p = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

// ── Local DB (docker container billing-e2e-pg only) ──────────────────────────
export function sql(query: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', 'billing-e2e-pg', 'psql', '-U', 'postgres', '-d', 'crm_e2e', '-tA', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', `SET search_path=crm; ${query}`],
    { encoding: 'utf8' }
  )
    .split(/\r?\n/)
    .filter((l) => l !== '' && l !== 'SET')
    .join('\n');
}
export const sqlInt = (q: string) => Number(sql(q).trim());

/** Independent per-tenant activity for a period, straight from SQL (not product code). */
export function dbActivity(p: { startUtc: string; endUtc: string }) {
  const rows = sql(`
    SELECT s."tenantId",
           COUNT(DISTINCT s."contactId") FILTER (WHERE m."senderType" = 'user'),
           COUNT(DISTINCT m."sessionId"),
           COUNT(*),
           COUNT(DISTINCT m."sessionId") FILTER (WHERE m."senderType" = 'agent')
    FROM "crm_agent_Message" m JOIN "crm_agent_ChatSession" s ON s.id = m."sessionId"
    WHERE m."createdAt" >= '${p.startUtc}' AND m."createdAt" < '${p.endUtc}'
    GROUP BY 1`);
  const byTenant: Record<string, { active: number; sessions: number; messages: number; handoffs: number }> = {};
  for (const line of rows.split('\n').filter(Boolean)) {
    const [t, a, s, m, h] = line.split('|');
    byTenant[t] = { active: +a, sessions: +s, messages: +m, handoffs: +h };
  }
  const platformActive = sqlInt(`
    SELECT COUNT(*) FROM (SELECT DISTINCT s."tenantId", s."contactId"
      FROM "crm_agent_Message" m JOIN "crm_agent_ChatSession" s ON s.id = m."sessionId"
      WHERE m."createdAt" >= '${p.startUtc}' AND m."createdAt" < '${p.endUtc}' AND m."senderType" = 'user') x`);
  const get = (id: string) => byTenant[id] ?? { active: 0, sessions: 0, messages: 0, handoffs: 0 };
  const sum = (k: 'active' | 'sessions' | 'messages' | 'handoffs') => Object.values(byTenant).reduce((a, r) => a + r[k], 0);
  return { get, platformActive, sum };
}

// ── Stub proxy control ───────────────────────────────────────────────────────
export async function stub(request: APIRequestContext, op: 'reset' | 'ok' | '500' | 'hang' | 'slow') {
  const url = op === 'reset' ? `${STUB}/__reset` : `${STUB}/__mode?set=${op}`;
  const res = await request.get(url);
  expect(res.ok()).toBeTruthy();
}
export async function stubLog(request: APIRequestContext): Promise<Array<{ query: Record<string, string>; internalKey: string | null }>> {
  return (await (await request.get(`${STUB}/__log`)).json()).log;
}

// ── Fixture (the Phase-A payload served by the stub) ─────────────────────────
type FixtureTenant = {
  tenant_id: string | null;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_count: number;
  error_count: number;
  unpriced_count: number;
};
export type Fixture = {
  totals: FixtureTenant;
  tenants: FixtureTenant[];
  by_day: Array<{ date: string; total_tokens: number }>;
  unpriced_models: string[];
};
export function fixture(name: string): Fixture {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'));
}
/** Totals recomputed from the per-tenant rows (not the payload's own totals). */
export function fixtureSums(f: Fixture) {
  const s = { input: 0, output: 0, tokens: 0, cost: 0, requests: 0, errors: 0, unpriced: 0 };
  for (const t of f.tenants) {
    s.input += t.input_tokens;
    s.output += t.output_tokens;
    s.tokens += t.input_tokens + t.output_tokens;
    s.cost += t.cost_usd;
    s.requests += t.request_count;
    s.errors += t.error_count;
    s.unpriced += t.unpriced_count;
  }
  return s;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
/** Credentials sign-in through next-auth's own endpoints; cookies land in the page's context. */
export async function apiLogin(page: Page, email: string) {
  const req = page.context().request;
  const csrf = (await (await req.get('/api/auth/csrf')).json()).csrfToken as string;
  const res = await req.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf, email, password: PASSWORD, callbackUrl: '/en/inbox' },
    maxRedirects: 0,
  });
  expect([200, 302]).toContain(res.status());
  const session = await (await req.get('/api/auth/session')).json();
  expect(session?.user?.email).toBe(email);
  return session;
}

/** Number formatting done by the browser's Intl (same engine as the page), for expected strings. */
export async function fmt(page: Page, locale: string, values: Record<string, number>, kind: 'int' | 'tokens' | 'cost') {
  return page.evaluate(
    ([loc, vals, k]) => {
      const f =
        k === 'int'
          ? new Intl.NumberFormat(loc as string)
          : k === 'tokens'
            ? new Intl.NumberFormat(loc as string, { notation: 'compact', maximumFractionDigits: 1 })
            : new Intl.NumberFormat(loc as string, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const out: Record<string, string> = {};
      for (const [key, v] of Object.entries(vals as Record<string, number>)) out[key] = (k === 'cost' ? '$' : '') + f.format(v);
      return out;
    },
    [locale, values, kind] as const
  );
}

export const card = (page: Page, label: string) => page.locator('h3', { hasText: new RegExp(`^${label}$`) }).locator('xpath=../..');

/** Visible tenant rows (excludes expanded detail rows) as arrays of cell texts. */
/** Visible text of an element: sr-only hints (e.g. ", 55 calls without a price…" after `*`) are removed. */
const VISIBLE = (el: Element): string => {
  const c = el.cloneNode(true) as HTMLElement;
  c.querySelectorAll('.sr-only').forEach((n) => n.remove());
  return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
};
export async function tableRows(page: Page): Promise<string[][]> {
  return page.locator('table tbody > tr:not(.bg-slate-50)').evaluateAll(
    (trs, fn) => {
      const vis = new Function(`return (${fn})`)() as (el: Element) => string;
      return trs.map((tr) => Array.from(tr.querySelectorAll(':scope > td')).map((td) => vis(td)));
    },
    VISIBLE.toString()
  );
}
export async function totalRow(page: Page): Promise<string[]> {
  return page.locator('table tfoot tr td').evaluateAll(
    (tds, fn) => {
      const vis = new Function(`return (${fn})`)() as (el: Element) => string;
      return tds.map((td) => vis(td));
    },
    VISIBLE.toString()
  );
}
/** Visible main value of a summary card (without the sr-only hint). */
export async function cardValue(page: Page, label: string): Promise<string> {
  return card(page, label).locator('p').first().evaluate((el, fn) => (new Function(`return (${fn})`)() as (e: Element) => string)(el), VISIBLE.toString());
}
/** Same text the dashboard shows for an orphan row, per locale. */
export function orphanLabel(dict: { admin: Record<string, string> }, id: string | null): string {
  return id === null ? dict.admin.noTenant : `${dict.admin.unknownTenant} (${id.slice(0, 8)})`;
}
export function dictionary(locale: string): { admin: Record<string, string>; sidebar: Record<string, string> } {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../../../src/dictionaries', `${locale}.json`), 'utf8'));
}

export async function openAdmin(page: Page, locale = 'en') {
  await page.goto(`/${locale}/admin`);
  await expect(page.locator('table tfoot')).toBeVisible({ timeout: 60_000 });
}

/** Minimal RFC 4180 parser (quoted fields, "" escapes, CRLF rows). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
