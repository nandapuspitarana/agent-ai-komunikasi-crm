// Pure helpers for the super-admin billing dashboard (period math, usage merge, CSV).
// No Prisma / next/server / Node-only APIs: the dashboard client component imports this file too.

export const MAX_BILLING_DAYS = 400;

export const billingTimezone = (): string => process.env.BILLING_TIMEZONE || 'Asia/Jakarta';

/** Inclusive calendar dates `from..to` in `tz`, as the UTC instants [start, end). */
export type BillingPeriod = { from: string; to: string; tz: string; start: Date; end: Date };

export class BillingPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingPeriodError';
  }
}

export type ProxyTenantUsage = {
  tenant_id: string | null;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_count: number;
  error_count: number;
  unpriced_count: number;
  by_type: Array<{ request_type: string; total_tokens: number; cost_usd: number; request_count: number }>;
  by_model: Array<{ model_name: string; total_tokens: number; cost_usd: number }>;
};

export type TenantAi = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  requests: number;
  errors: number;
  byType: ProxyTenantUsage['by_type'];
  byModel: ProxyTenantUsage['by_model'];
};

export type TenantRow = {
  id: string | null;
  name: string;
  plan: string | null;
  aiEnabled: boolean | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  staff: { total: number; active: number; byRole: Record<string, number> };
  endUsers: { activeInPeriod: number; storedProfiles: number; newProfilesInPeriod: number };
  activity: { sessions: number; messages: number; handoffs: number };
  ai: TenantAi | null;
  known: boolean;
};

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const isoDate = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

/** Parses a strict, real calendar date `YYYY-MM-DD`; returns null otherwise. */
function parseDate(date: string): { y: number; m: number; d: number } | null {
  const match = DATE_RE.exec(date);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

function formatter(tz: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    throw new BillingPeriodError(`Zona waktu tidak valid: ${tz}`);
  }
}

/** Wall-clock fields of `instant` in the formatter's tz. */
function zonedFields(fmt: Intl.DateTimeFormat, instant: Date) {
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** tz offset (ms, local minus UTC) at `instant`. */
function offsetMs(fmt: Intl.DateTimeFormat, instant: Date): number {
  const f = zonedFields(fmt, instant);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** 00:00 local time of `date` (`YYYY-MM-DD`) in `tz`, as a UTC instant. */
export function zonedMidnightToUtc(date: string, tz: string): Date {
  const parsed = parseDate(date);
  if (!parsed) throw new BillingPeriodError(`Tanggal tidak valid: ${date}`);
  const fmt = formatter(tz);
  const guess = Date.UTC(parsed.y, parsed.m - 1, parsed.d);
  // Second pass resolves zones whose offset differs between the guess and the real instant (DST).
  const first = guess - offsetMs(fmt, new Date(guess));
  return new Date(guess - offsetMs(fmt, new Date(first)));
}

/** Today's calendar date in `tz`. */
function localToday(tz: string, now: Date): { y: number; m: number; d: number } {
  const f = zonedFields(formatter(tz), now);
  return { y: f.year, m: f.month, d: f.day };
}

const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function presetPeriod(
  preset: 'this_month' | 'last_month',
  tz: string,
  now: Date = new Date()
): { from: string; to: string } {
  const today = localToday(tz, now);
  let { y, m } = today;
  if (preset === 'last_month') {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return { from: isoDate(y, m, 1), to: isoDate(y, m, lastDayOfMonth(y, m)) };
}

export function resolvePeriod(
  from: string | null,
  to: string | null,
  tz: string,
  now: Date = new Date()
): BillingPeriod {
  if ((from === null) !== (to === null)) {
    throw new BillingPeriodError('Parameter from dan to harus diisi bersamaan');
  }
  let f: string;
  let t: string;
  if (from === null || to === null) {
    ({ from: f, to: t } = presetPeriod('this_month', tz, now));
  } else {
    f = from;
    t = to;
  }

  const pf = parseDate(f);
  const pt = parseDate(t);
  if (!pf || !pt) throw new BillingPeriodError('Format tanggal harus YYYY-MM-DD');

  const days = (Date.UTC(pt.y, pt.m - 1, pt.d) - Date.UTC(pf.y, pf.m - 1, pf.d)) / DAY_MS + 1;
  if (days < 1) throw new BillingPeriodError('Tanggal from tidak boleh setelah to');
  if (days > MAX_BILLING_DAYS) throw new BillingPeriodError(`Periode maksimal ${MAX_BILLING_DAYS} hari`);

  const start = zonedMidnightToUtc(f, tz);
  const end = zonedMidnightToUtc(isoDate(...nextDay(pt)), tz);
  return { from: f, to: t, tz, start, end };
}

function nextDay(p: { y: number; m: number; d: number }): [number, number, number] {
  const n = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
  return [n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()];
}

const zeroAi = (): TenantAi => ({
  totalTokens: 0,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  requests: 0,
  errors: 0,
  byType: [],
  byModel: [],
});

const toAi = (u: ProxyTenantUsage): TenantAi => ({
  totalTokens: u.total_tokens,
  inputTokens: u.input_tokens,
  cachedInputTokens: u.cached_input_tokens,
  outputTokens: u.output_tokens,
  costUsd: u.cost_usd,
  requests: u.request_count,
  errors: u.error_count,
  byType: u.by_type,
  byModel: u.by_model,
});

/**
 * Joins CRM tenant rows with proxy usage. `usage === null` means the proxy failed: ai stays null
 * (unknown), never 0. Usage for tenants the CRM does not know is appended as `known: false` rows.
 */
export function mergeTenantUsage(crmRows: TenantRow[], usage: ProxyTenantUsage[] | null): TenantRow[] {
  if (usage === null) return crmRows.map((r) => ({ ...r, ai: null }));

  const byTenant = new Map<string, ProxyTenantUsage>();
  const orphans: ProxyTenantUsage[] = [];
  const knownIds = new Set(crmRows.map((r) => r.id).filter((id): id is string => id !== null));
  for (const u of usage) {
    if (u.tenant_id !== null && knownIds.has(u.tenant_id)) byTenant.set(u.tenant_id, u);
    else orphans.push(u);
  }

  const merged = crmRows.map((r) => {
    const u = r.id === null ? undefined : byTenant.get(r.id);
    return { ...r, ai: u ? toAi(u) : zeroAi() };
  });

  for (const u of orphans) {
    merged.push({
      id: u.tenant_id,
      name: u.tenant_id === null ? 'Tanpa tenant' : `Tenant tidak dikenal (${u.tenant_id.slice(0, 8)})`,
      plan: null,
      aiEnabled: null,
      createdAt: null,
      lastActivityAt: null,
      staff: { total: 0, active: 0, byRole: {} },
      endUsers: { activeInPeriod: 0, storedProfiles: 0, newProfilesInPeriod: 0 },
      activity: { sessions: 0, messages: 0, handoffs: 0 },
      ai: toAi(u),
      known: false,
    });
  }
  return merged;
}

/** True when the proxy's retained data starts after the requested period start (totals may be partial). */
export function needsRetentionWarning(period: BillingPeriod, oldestAvailable: string | null): boolean {
  return oldestAvailable !== null && new Date(oldestAvailable) > period.start;
}

export const CSV_COLUMNS = [
  'tenant_id',
  'tenant_name',
  'plan',
  'period_from',
  'period_to',
  'staff_total',
  'staff_active',
  'end_users_active',
  'sessions',
  'messages',
  'input_tokens',
  'cached_input_tokens',
  'output_tokens',
  'total_tokens',
  'requests',
  'cost_usd',
] as const;

const csvCell = (value: string | number | null): string => {
  if (value === null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildBillingCsv(rows: TenantRow[], period: Pick<BillingPeriod, 'from' | 'to'>): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) {
    const ai = r.ai;
    lines.push(
      [
        r.id,
        r.name,
        r.plan,
        period.from,
        period.to,
        r.staff.total,
        r.staff.active,
        r.endUsers.activeInPeriod,
        r.activity.sessions,
        r.activity.messages,
        ai ? ai.inputTokens : null,
        ai ? ai.cachedInputTokens : null,
        ai ? ai.outputTokens : null,
        ai ? ai.totalTokens : null,
        ai ? ai.requests : null,
        ai ? ai.costUsd.toFixed(6) : null,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

export const billingCsvFilename = (period: Pick<BillingPeriod, 'from' | 'to'>): string =>
  `billing_${period.from}_${period.to}.csv`;
