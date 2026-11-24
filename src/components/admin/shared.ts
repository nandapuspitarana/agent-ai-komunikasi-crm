// Shared types and number formatters for the super-admin billing dashboard components.
// Type-only import from admin-stats: erased at build time, so no Prisma code reaches the client bundle.
import type { PlatformStats } from '@/lib/admin-stats';
import type { BillingApiError, TenantLabels, TenantRow } from '@/lib/admin-billing';

export type { PlatformStats, TenantRow };

export type AdminAiTotals = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  request_count: number;
  error_count: number;
  unpriced_count: number;
};

export type AdminDayUsage = { date: string; total_tokens: number; cost_usd: number; request_count: number };

export type AdminAi =
  | {
      status: 'ok';
      totals: AdminAiTotals;
      byDay?: AdminDayUsage[];
      unpricedModels?: string[];
      oldestAvailable?: string | null;
    }
  | { status: 'unavailable'; error: BillingApiError };

export type AdminOverview = {
  period: { from: string; to: string; tz: string };
  platform: PlatformStats;
  ai: AdminAi;
  tenants: TenantRow[];
};

/** Shown instead of a number when the value is unknown (never 0 for unknown). */
export const NA = '—';

export const formatInt = (n: number, locale: string): string => new Intl.NumberFormat(locale).format(n);

export const formatTokens = (n: number, locale: string): string =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const costDigits = (n: number, locale: string, min: number, max: number): string =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);

/**
 * Money with 2 decimals. A positive amount below one cent is never shown as $0.00 (that reads as "no usage"):
 * it gets up to 4 decimals, and below half of $0.0001 it shows "<$0.0001". Same rule in cards, table, chart.
 * The CSV export keeps 6 decimals (buildBillingCsv).
 */
export const formatCost = (n: number, locale: string): string => {
  if (n > 0 && n < 0.01) {
    return n < 0.00005 ? `<$${costDigits(0.0001, locale, 4, 4)}` : `$${costDigits(n, locale, 2, 4)}`;
  }
  return `$${costDigits(n, locale, 2, 2)}`;
};

/** Hint for a cost with unpriced calls ("N calls without a price"): table cells, TOTAL and the summary card. */
export const unpricedHint = (ta: (key: string, fallback: string) => string, count: number, locale: string): string =>
  ta('unpricedCellHint', '{count} calls without a price — cost not included').replace('{count}', formatInt(count, locale));

/** Above this many days the trend chart draws one bar per week instead of per day (bars stay legible on a phone). */
export const TREND_WEEKLY_ABOVE_DAYS = 62;

export type UsageBucket = { from: string; to: string; days: number; total_tokens: number; cost_usd: number; request_count: number };

/**
 * Chart bars: one per day up to TREND_WEEKLY_ABOVE_DAYS days, otherwise one per 7 consecutive days counted from
 * the first day (the last bucket may be shorter). `days` must be the dense, date-ordered list of the period.
 */
export const bucketUsage = (days: AdminDayUsage[]): { weekly: boolean; buckets: UsageBucket[] } => {
  const weekly = days.length > TREND_WEEKLY_ABOVE_DAYS;
  const size = weekly ? 7 : 1;
  const buckets: UsageBucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    buckets.push({
      from: chunk[0].date,
      to: chunk[chunk.length - 1].date,
      days: chunk.length,
      total_tokens: chunk.reduce((s, d) => s + d.total_tokens, 0),
      cost_usd: chunk.reduce((s, d) => s + d.cost_usd, 0),
      request_count: chunk.reduce((s, d) => s + d.request_count, 0),
    });
  }
  return { weekly, buckets };
};


// Machine error codes of /api/admin/overview -> dictionary key (+ English fallback). Anything unmapped,
// including the plain-string errors of the shared auth guard, falls back to the generic message.
const ERROR_MESSAGES: Record<string, { key: string; fallback: string }> = {
  period_incomplete: { key: 'errPeriodIncomplete', fallback: 'Select both a start and an end date' },
  period_invalid: { key: 'errPeriodInvalid', fallback: 'Enter valid dates' },
  period_order: { key: 'errPeriodOrder', fallback: 'The start date must not be after the end date' },
  period_too_long: { key: 'errPeriodTooLong', fallback: 'The period can be at most {max} days' },
  server_timezone: { key: 'errServerTimezone', fallback: 'The server billing time zone is misconfigured. Contact an administrator.' },
};
// Own-property check: a server-sent code like 'constructor' or '__proto__' must not hit Object.prototype.
const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

const GENERIC_ERROR = { key: 'errGeneric', fallback: 'Something went wrong. Please try again.' };

/** Dictionary key and English fallback for an API/validation error code. */
export const errorMessageFor = (code: string | null | undefined) =>
  (code && hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : undefined) ?? GENERIC_ERROR;

/** The machine code of an API error body (`{ error: { code } }`), or null when it carries none. */
export const errorCodeOf = (body: unknown): string | null => {
  const error = (body as { error?: unknown } | null)?.error;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

/** Localized orphan-row labels from the `admin` dictionary; feed them to tenantLabel() / buildBillingCsv(). */
export const tenantLabelsFrom = (ta: (key: string, fallback: string) => string): TenantLabels => ({
  unknown: ta('unknownTenant', 'Unknown tenant'),
  none: ta('noTenant', 'No tenant'),
});

/** What the proxy puts in `unpriced_models` for calls that carry no model name (observability/billing.py). */
export const UNKNOWN_MODEL_SENTINEL = '(unknown)';

/** Localized model name: a missing name, or the proxy's "(unknown)" sentinel, shows the translated "unknown" label. */
export const modelLabel = (ta: (key: string, fallback: string) => string, name: string | null | undefined): string =>
  !name || name === UNKNOWN_MODEL_SENTINEL ? ta('unknownModel', '(unknown)') : name;

const ROLES: Record<string, { short: [string, string]; name: [string, string] }> = {
  SUPER_ADMIN: { short: ['roleShortSuperAdmin', 'SA'], name: ['roleSuperAdmin', 'Super Admin'] },
  BUSINESS_PARTNER: { short: ['roleShortBusinessPartner', 'BP'], name: ['roleBusinessPartner', 'Business Partner'] },
  AGENT: { short: ['roleShortAgent', 'AG'], name: ['roleAgent', 'Agent'] },
};

/** Localized staff role: short form for the summary card, full name for the row details. Unknown roles stay raw. */
export const roleLabel = (ta: (key: string, fallback: string) => string, role: string, form: 'short' | 'name'): string => {
  if (!hasOwn(ROLES, role)) return role;
  const [key, fallback] = ROLES[role][form];
  return ta(key, fallback);
};
