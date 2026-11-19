import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-guard';
import { agentProxyFetch } from '@/lib/agent-proxy-client';
import {
  BillingPeriodError,
  billingTimezone,
  mergeTenantUsage,
  resolvePeriod,
  type ProxyTenantUsage,
} from '@/lib/admin-billing';
import { getAdminStats } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

const PROXY_TIMEOUT_MS = 15_000;
const PROXY_ERROR = 'Layanan AI tidak dapat dihubungi';

type ProxyUsageResponse = {
  totals: Record<string, number>;
  tenants: ProxyTenantUsage[];
  by_day: Array<{ date: string; total_tokens: number; cost_usd: number; request_count: number }>;
  unpriced_models: string[];
  retention: { metrics_days: number; oldest_available: string | null };
};

async function fetchProxyUsage(from: string, to: string, tz: string): Promise<ProxyUsageResponse | null> {
  try {
    const qs = new URLSearchParams({ from, to, tz });
    const res = await agentProxyFetch(`/api/v1/observability/usage-by-tenant?${qs.toString()}`, {
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[admin/overview] proxy', `HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as ProxyUsageResponse;
    if (!body || !Array.isArray(body.tenants) || !body.totals) {
      console.error('[admin/overview] proxy', 'unexpected response shape');
      return null;
    }
    return body;
  } catch (err) {
    console.error('[admin/overview] proxy', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireUser({ roles: ['SUPER_ADMIN'], requireTenant: false });
  if (!guard.ok) return guard.response;

  const sp = request.nextUrl.searchParams;
  let period;
  try {
    period = resolvePeriod(sp.get('from'), sp.get('to'), billingTimezone());
  } catch (err) {
    if (err instanceof BillingPeriodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    const [stats, usage] = await Promise.all([
      getAdminStats(period),
      fetchProxyUsage(period.from, period.to, period.tz),
    ]);

    const tenants = mergeTenantUsage(stats.tenants, usage ? usage.tenants : null).sort((a, b) => {
      if (a.ai === null && b.ai !== null) return 1;
      if (a.ai !== null && b.ai === null) return -1;
      if (a.ai && b.ai && a.ai.costUsd !== b.ai.costUsd) return b.ai.costUsd - a.ai.costUsd;
      return a.name.localeCompare(b.name);
    });

    const ai = usage
      ? {
          status: 'ok' as const,
          totals: usage.totals,
          byDay: usage.by_day,
          unpricedModels: usage.unpriced_models,
          oldestAvailable: usage.retention?.oldest_available ?? null,
        }
      : { status: 'unavailable' as const, error: PROXY_ERROR };

    return NextResponse.json({
      period: { from: period.from, to: period.to, tz: period.tz },
      platform: stats.platform,
      ai,
      tenants,
    });
  } catch (err) {
    console.error('[admin/overview] failed', err);
    return NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 });
  }
}
