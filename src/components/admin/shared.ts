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

export const formatCost = (n: number, locale: string): string =>
  `$${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;


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
