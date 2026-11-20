import { describe, it, expect } from 'vitest';
import {
  MAX_BILLING_DAYS,
  BillingPeriodError,
  resolvePeriod,
  validatePeriodRange,
  tenantLabel,
  DEFAULT_TENANT_LABELS,
  presetPeriod,
  zonedMidnightToUtc,
  mergeTenantUsage,
  needsRetentionWarning,
  buildBillingCsv,
  billingCsvFilename,
  type ProxyTenantUsage,
  type TenantRow,
} from '@/lib/admin-billing';

const JKT = 'Asia/Jakarta';

const crmRow = (over: Partial<TenantRow> = {}): TenantRow => ({
  id: 'A',
  name: 'Tenant A',
  plan: 'pro',
  aiEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActivityAt: '2026-11-18T00:00:00.000Z',
  staff: { total: 3, active: 2, byRole: { admin: 1, agent: 2 } },
  endUsers: { activeInPeriod: 10, storedProfiles: 50, newProfilesInPeriod: 4 },
  activity: { sessions: 12, messages: 340, handoffs: 1 },
  ai: null,
  known: true,
  ...over,
});

const usage = (over: Partial<ProxyTenantUsage> = {}): ProxyTenantUsage => ({
  tenant_id: 'A',
  input_tokens: 100,
  cached_input_tokens: 20,
  output_tokens: 50,
  total_tokens: 150,
  cost_usd: 0.1,
  request_count: 5,
  error_count: 1,
  unpriced_count: 0,
  by_type: [{ request_type: 'chat', total_tokens: 150, cost_usd: 0.1, request_count: 5 }],
  by_model: [{ model_name: 'm1', total_tokens: 150, cost_usd: 0.1 }],
  ...over,
});

describe('resolvePeriod', () => {
  it('defaults to the current month in the tz (Jakarta is already Nov 20 at 20:00Z Nov 19)', () => {
    const p = resolvePeriod(null, null, JKT, new Date('2026-11-19T20:00:00Z'));
    expect(p.from).toBe('2026-11-01');
    expect(p.to).toBe('2026-11-30');
    expect(p.tz).toBe(JKT);
    expect(p.start.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-30T17:00:00.000Z');
  });

  it('uses the tz-local day, not the UTC day, at the month boundary', () => {
    const p = resolvePeriod(null, null, JKT, new Date('2026-11-30T17:30:00Z'));
    expect(p.from).toBe('2026-12-01');
    expect(p.to).toBe('2026-12-31');
  });

  it('treats to as inclusive: end is the midnight after to', () => {
    const p = resolvePeriod('2026-11-05', '2026-11-05', JKT);
    expect(p.start.toISOString()).toBe('2026-11-04T17:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-05T17:00:00.000Z');
  });

  it('rejects invalid input with BillingPeriodError', () => {
    expect(() => resolvePeriod('2026-11-30', '2026-11-01', JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod('2025-01-01', '2026-02-05', JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod('2026-11-01', null, JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod(null, '2026-11-01', JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod('2026/11/01', '2026-11-30', JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod('2026-02-30', '2026-03-05', JKT)).toThrow(BillingPeriodError);
    expect(() => resolvePeriod('2026-11-01', '2026-11-30', 'Mars/Base')).toThrow(BillingPeriodError);
    expect(() => resolvePeriod(null, null, 'Mars/Base')).toThrow(BillingPeriodError);
  });

  it('accepts exactly 400 days inclusive and rejects 401', () => {
    expect(MAX_BILLING_DAYS).toBe(400);
    expect(() => resolvePeriod('2025-10-16', '2026-11-19', JKT)).not.toThrow();
    expect(() => resolvePeriod('2025-10-15', '2026-11-19', JKT)).toThrow(BillingPeriodError);
  });

  const codeOf = (fn: () => unknown) => {
    try {
      fn();
    } catch (err) {
      return err instanceof BillingPeriodError ? err.code : 'not-a-BillingPeriodError';
    }
    return null;
  };

  it('throws a stable machine code per failure, with an English message (no Indonesian)', () => {
    expect(codeOf(() => resolvePeriod('2026-11-30', '2026-11-01', JKT))).toBe('period_order');
    expect(codeOf(() => resolvePeriod('2025-01-01', '2026-02-05', JKT))).toBe('period_too_long');
    expect(codeOf(() => resolvePeriod('2026-11-01', null, JKT))).toBe('period_incomplete');
    expect(codeOf(() => resolvePeriod(null, '2026-11-01', JKT))).toBe('period_incomplete');
    expect(codeOf(() => resolvePeriod('', '', JKT))).toBe('period_incomplete');
    expect(codeOf(() => resolvePeriod('2026/11/01', '2026-11-30', JKT))).toBe('period_invalid');
    expect(codeOf(() => resolvePeriod('2026-02-30', '2026-03-05', JKT))).toBe('period_invalid');
    // A bad time zone comes from the server env, so it is its own (server-side) code.
    expect(codeOf(() => resolvePeriod('2026-11-01', '2026-11-30', 'Mars/Base'))).toBe('server_timezone');
    expect(codeOf(() => resolvePeriod(null, null, 'Mars/Base'))).toBe('server_timezone');

    for (const [f, t] of [['2026-11-30', '2026-11-01'], ['2025-01-01', '2026-02-05'], ['x', 'y']]) {
      try {
        resolvePeriod(f, t, JKT);
        throw new Error('expected a BillingPeriodError');
      } catch (err) {
        expect(err).toBeInstanceOf(BillingPeriodError);
        expect((err as Error).message).not.toMatch(/Periode|Tanggal|tidak|Zona|harus/);
      }
    }
  });

  it('the too-long message carries the shared MAX_BILLING_DAYS', () => {
    expect(() => resolvePeriod('2025-01-01', '2026-02-05', JKT)).toThrow(String(MAX_BILLING_DAYS));
  });
});

describe('validatePeriodRange (shared by the API and the period picker)', () => {
  it('accepts a valid range, including a single day and exactly MAX_BILLING_DAYS', () => {
    expect(validatePeriodRange('2026-11-05', '2026-11-05')).toBeNull();
    expect(validatePeriodRange('2025-10-16', '2026-11-19')).toBeNull();
  });

  it('flags empty dates as incomplete, before parsing', () => {
    expect(validatePeriodRange('', '2026-11-05')).toBe('period_incomplete');
    expect(validatePeriodRange('2026-11-05', '')).toBe('period_incomplete');
    expect(validatePeriodRange(null, null)).toBe('period_incomplete');
  });

  it('flags from after to, and non-dates', () => {
    expect(validatePeriodRange('2026-11-06', '2026-11-05')).toBe('period_order');
    expect(validatePeriodRange('2026-13-01', '2026-11-05')).toBe('period_invalid');
  });

  it('counts the 400-day cap inclusively: 400 days pass, 401 do not', () => {
    expect(validatePeriodRange('2025-10-16', '2026-11-19')).toBeNull(); // 400 days
    expect(validatePeriodRange('2025-10-15', '2026-11-19')).toBe('period_too_long'); // 401 days
  });

  it('agrees with resolvePeriod for every case', () => {
    const cases: Array<[string, string]> = [
      ['2026-11-05', '2026-11-05'],
      ['2026-11-06', '2026-11-05'],
      ['2025-10-16', '2026-11-19'],
      ['2025-10-15', '2026-11-19'],
      ['2026-02-30', '2026-03-05'],
    ];
    for (const [f, t] of cases) {
      if (validatePeriodRange(f, t) === null) expect(() => resolvePeriod(f, t, JKT)).not.toThrow();
      else expect(() => resolvePeriod(f, t, JKT)).toThrow(BillingPeriodError);
    }
  });
});

describe('presetPeriod', () => {
  it('this_month covers the whole current month in the tz', () => {
    expect(presetPeriod('this_month', JKT, new Date('2026-11-19T20:00:00Z'))).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('last_month handles short months and year rollover', () => {
    expect(presetPeriod('last_month', JKT, new Date('2026-03-10T00:00:00Z'))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(presetPeriod('last_month', 'UTC', new Date('2026-01-05T00:00:00Z'))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
});

describe('zonedMidnightToUtc', () => {
  it('converts local midnight to the UTC instant', () => {
    expect(zonedMidnightToUtc('2026-11-01', JKT).toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(zonedMidnightToUtc('2026-11-01', 'UTC').toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('follows DST (America/New_York: EDT in July, EST in January)', () => {
    expect(zonedMidnightToUtc('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z');
    expect(zonedMidnightToUtc('2026-01-01', 'America/New_York').toISOString()).toBe('2026-01-01T05:00:00.000Z');
  });
});

describe('mergeTenantUsage', () => {
  it('usage null -> every row has ai === null', () => {
    const out = mergeTenantUsage([crmRow(), crmRow({ id: 'B' })], null);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.ai === null)).toBe(true);
  });

  it('CRM tenant without usage gets zeroed ai (not null)', () => {
    const out = mergeTenantUsage([crmRow()], []);
    expect(out[0].ai).toEqual({
      totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0,
      costUsd: 0, requests: 0, errors: 0, unpricedCount: 0, byType: [], byModel: [],
    });
  });

  it('maps snake_case usage to camelCase for a known tenant and keeps CRM fields', () => {
    const [row] = mergeTenantUsage([crmRow()], [usage()]);
    expect(row.known).toBe(true);
    expect(row.activity.messages).toBe(340);
    expect(row.ai).toEqual({
      totalTokens: 150, inputTokens: 100, cachedInputTokens: 20, outputTokens: 50,
      costUsd: 0.1, requests: 5, errors: 1, unpricedCount: 0,
      byType: [{ request_type: 'chat', total_tokens: 150, cost_usd: 0.1, request_count: 5 }],
      byModel: [{ model_name: 'm1', total_tokens: 150, cost_usd: 0.1 }],
    });
  });

  it('appends unknown-tenant rows with CRM fields zeroed, without reordering', () => {
    const rows = [crmRow({ id: 'B', name: 'B' }), crmRow({ id: 'A' })];
    const out = mergeTenantUsage(rows, [
      usage({ tenant_id: 'zzzzzzzz-1111', total_tokens: 7 }),
      usage({ tenant_id: null, total_tokens: 3 }),
      usage({ tenant_id: 'A', total_tokens: 11 }),
    ]);
    expect(out.map((r) => r.id)).toEqual(['B', 'A', 'zzzzzzzz-1111', null]);

    const unknown = out[2];
    expect(unknown.known).toBe(false);
    expect(unknown.name).toBeNull(); // no server-side (Indonesian) label: the client localizes
    expect(unknown.orphanKind).toBe('unknown');
    expect(unknown).toMatchObject({
      plan: null, aiEnabled: null, createdAt: null, lastActivityAt: null,
      staff: { total: 0, active: 0, byRole: {} },
      endUsers: { activeInPeriod: 0, storedProfiles: 0, newProfilesInPeriod: 0 },
      activity: { sessions: 0, messages: 0, handoffs: 0 },
    });

    expect(out[3].known).toBe(false);
    expect(out[3].name).toBeNull();
    expect(out[3].orphanKind).toBe('none');
    expect(out[3].id).toBeNull();
    // CRM-known rows carry no orphan kind
    expect(out[0].orphanKind).toBeUndefined();
  });

  it('maps unpriced_count to unpricedCount', () => {
    const [row] = mergeTenantUsage([crmRow()], [usage({ unpriced_count: 3 })]);
    expect(row.ai?.unpricedCount).toBe(3);
  });

  it('total tokens across all rows equals the sum of usage total_tokens', () => {
    const list = [
      usage({ tenant_id: 'A', total_tokens: 11 }),
      usage({ tenant_id: 'zzzzzzzz-1111', total_tokens: 7 }),
      usage({ tenant_id: null, total_tokens: 3 }),
    ];
    const out = mergeTenantUsage([crmRow(), crmRow({ id: 'B' })], list);
    const sum = out.reduce((s, r) => s + (r.ai?.totalTokens ?? 0), 0);
    expect(sum).toBe(list.reduce((s, u) => s + u.total_tokens, 0));
  });
});

describe('tenantLabel', () => {
  const labels = { unknown: 'Tenant tak dikenal', none: 'Tanpa tenant' };
  const orphan = (id: string | null, orphanKind: 'unknown' | 'none') =>
    crmRow({ id, name: null, known: false, orphanKind });

  it('uses the CRM name for known rows', () => {
    expect(tenantLabel(crmRow(), labels)).toBe('Tenant A');
  });

  it('localized label plus the first 8 characters of the id for unknown tenants', () => {
    expect(tenantLabel(orphan('zzzzzzzz-1111-2222', 'unknown'), labels)).toBe('Tenant tak dikenal (zzzzzzzz)');
  });

  it('localized label alone when there is no tenant', () => {
    expect(tenantLabel(orphan(null, 'none'), labels)).toBe('Tanpa tenant');
  });

  it('falls back to the no-tenant label for a null id even without a kind', () => {
    expect(tenantLabel(crmRow({ id: null, name: null, known: false }), labels)).toBe('Tanpa tenant');
  });

  it('ships English defaults', () => {
    expect(DEFAULT_TENANT_LABELS).toEqual({ unknown: 'Unknown tenant', none: 'No tenant' });
  });
});

describe('needsRetentionWarning', () => {
  const period = resolvePeriod('2026-11-01', '2026-11-30', JKT);
  it('warns only when the oldest available data starts after the period start', () => {
    expect(needsRetentionWarning(period, '2026-11-10T00:00:00Z')).toBe(true);
    expect(needsRetentionWarning(period, '2026-10-01T00:00:00Z')).toBe(false);
    expect(needsRetentionWarning(period, null)).toBe(false);
  });
});

describe('buildBillingCsv', () => {
  const HEADER =
    'tenant_id,tenant_name,plan,period_from,period_to,staff_total,staff_active,end_users_active,sessions,messages,input_tokens,cached_input_tokens,output_tokens,total_tokens,requests,cost_usd,unpriced_requests';
  const period = { from: '2026-11-01', to: '2026-11-30' };

  it('has the exact header and \\r\\n line endings', () => {
    const csv = buildBillingCsv([crmRow({ ai: null })], period);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(2);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('emits a full row with cost_usd at 6 decimals', () => {
    const [row] = mergeTenantUsage([crmRow()], [usage()]);
    const csv = buildBillingCsv([row], period);
    expect(csv.split('\r\n')[1]).toBe('A,Tenant A,pro,2026-11-01,2026-11-30,3,2,10,12,340,100,20,50,150,5,0.100000,0');
  });

  it('RFC 4180 quotes commas, quotes and newlines', () => {
    const csv = buildBillingCsv([crmRow({ name: 'Acme, "Intl"\nLtd' })], period);
    expect(csv).toContain('"Acme, ""Intl""\nLtd"');
  });

  it('leaves token and cost cells empty (not 0) when ai is null', () => {
    const csv = buildBillingCsv([crmRow({ ai: null })], period);
    expect(csv.split('\r\n')[1]).toBe('A,Tenant A,pro,2026-11-01,2026-11-30,3,2,10,12,340,,,,,,,');
  });

  it('emits unpriced_requests as the trailing column', () => {
    const [row] = mergeTenantUsage([crmRow()], [usage({ unpriced_count: 4 })]);
    const cells = buildBillingCsv([row], period).split('\r\n')[1].split(',');
    expect(cells[cells.length - 1]).toBe('4');
  });

  it('neutralises spreadsheet formulas in text cells (CSV injection)', () => {
    const line = (name: string) => buildBillingCsv([crmRow({ name })], period).split('\r\n')[1];
    expect(line('=HYPERLINK("x")')).toContain(`,"'=HYPERLINK(""x"")",`);
    expect(line('@SUM(A1)')).toContain(`,'@SUM(A1),`);
    expect(line('+1')).toContain(`,'+1,`);
    expect(line('-1')).toContain(`,'-1,`);
    expect(line('\tcmd')).toContain(`,'\tcmd,`);
    expect(line('Normal Name')).toContain(',Normal Name,');
  });

  it('does not prefix numeric cells, even negative ones', () => {
    const [row] = mergeTenantUsage([crmRow()], [usage({ cost_usd: -0.5 })]);
    const csv = buildBillingCsv([row], period).split('\r\n')[1];
    expect(csv).toContain(',-0.500000,');
    expect(csv).not.toContain("'-0.5");
  });

  it('leaves tenant_id and plan empty when null', () => {
    const csv = buildBillingCsv([crmRow({ id: null, plan: null, name: 'Acme' })], period);
    expect(csv.split('\r\n')[1].startsWith(',Acme,,2026-11-01')).toBe(true);
  });

  describe('orphan rows and the label resolver', () => {
    const merged = () =>
      mergeTenantUsage([crmRow()], [usage({ tenant_id: 'zzzzzzzz-1111' }), usage({ tenant_id: null })]).slice(1);
    const nameCells = (csv: string) => csv.split('\r\n').slice(1).map((l) => l.split(',')[1]);

    it('exports the English default label when no resolver is given (never Indonesian)', () => {
      expect(nameCells(buildBillingCsv(merged(), period))).toEqual(['Unknown tenant (zzzzzzzz)', 'No tenant']);
    });

    it('exports whatever the resolver returns, the same text the table displays', () => {
      const labels = { unknown: 'Locataire inconnu', none: 'Sans locataire' };
      const csv = buildBillingCsv(merged(), period, (r) => tenantLabel(r, labels));
      expect(nameCells(csv)).toEqual(['Locataire inconnu (zzzzzzzz)', 'Sans locataire']);
    });

    it('applies the formula-injection guard and quoting to the resolved label', () => {
      const labels = { unknown: '=cmd|x', none: '@none, "q"' };
      const csv = buildBillingCsv(merged(), period, (r) => tenantLabel(r, labels));
      const lines = csv.split('\r\n');
      expect(lines[1]).toContain(",'=cmd|x (zzzzzzzz),");
      expect(lines[2]).toContain(`,"'@none, ""q""",`);
    });

    it("a resolver returning '=X' for orphan rows comes out as '=X (formula guard on the localized label)", () => {
      const csv = buildBillingCsv(merged(), period, () => '=X');
      expect(nameCells(csv)).toEqual(["'=X", "'=X"]);
    });

    it('emits the localized label for both the unknown and the none row', () => {
      const labels = { unknown: 'Tenant tidak dikenal', none: 'Tanpa tenant' };
      const csv = buildBillingCsv(merged(), period, (r) => tenantLabel(r, labels));
      expect(nameCells(csv)).toEqual(['Tenant tidak dikenal (zzzzzzzz)', 'Tanpa tenant']);
    });

    it('applies the guard to a CRM name returned by the resolver too', () => {
      const csv = buildBillingCsv([crmRow({ name: 'Plain' })], period, () => '=1+1');
      expect(csv.split('\r\n')[1]).toContain(",'=1+1,");
    });
  });
});

describe('billingCsvFilename', () => {
  it('is billing_<from>_<to>.csv', () => {
    expect(billingCsvFilename({ from: '2026-11-01', to: '2026-11-30' })).toBe('billing_2026-11-01_2026-11-30.csv');
  });
});
