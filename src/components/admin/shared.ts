// Shared types and number formatters for the super-admin billing dashboard components.
// Type-only import from admin-stats: erased at build time, so no Prisma code reaches the client bundle.
import type { PlatformStats } from '@/lib/admin-stats';
import type { TenantRow } from '@/lib/admin-billing';

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
  | { status: 'unavailable'; error: string };

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
