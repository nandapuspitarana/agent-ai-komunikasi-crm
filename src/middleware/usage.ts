import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

// In-Memory cache for usage metrics
const usageCache = new Map<string, { value: number; expiresAt: number }>();

function getCacheValue(key: string): number {
  const now = Date.now();
  const cached = usageCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  return 0;
}

function incrCacheValue(key: string, amount: number, ttlSeconds: number): number {
  const now = Date.now();
  const cached = usageCache.get(key);
  let newValue = amount;
  let expiresAt = now + ttlSeconds * 1000;
  
  if (cached && cached.expiresAt > now) {
    newValue = cached.value + amount;
    expiresAt = cached.expiresAt;
  }
  
  usageCache.set(key, { value: newValue, expiresAt });
  return newValue;
}

function delCacheKey(key: string) {
  usageCache.delete(key);
}

/**
 * Usage Tracking Middleware
 * Tracks and enforces SaaS usage limits for tenants
 */

export interface UsageMetrics {
  messages_sent: number;
  messages_received: number;
  api_calls: number;
  flows_executed: number;
  integrations_used: number;
  storage_bytes: number;
}

export interface UsageLimits {
  messages_per_month: number;
  api_calls_per_day: number;
  flows_per_tenant: number;
  integrations_per_tenant: number;
  storage_gb: number;
}

export interface PlanLimits {
  free: UsageLimits;
  starter: UsageLimits;
  professional: UsageLimits;
  enterprise: UsageLimits;
}

const PLAN_LIMITS: PlanLimits = {
  free: {
    messages_per_month: 100,
    api_calls_per_day: 50,
    flows_per_tenant: 3,
    integrations_per_tenant: 1,
    storage_gb: 0.1,
  },
  starter: {
    messages_per_month: 10000,
    api_calls_per_day: 1000,
    flows_per_tenant: 20,
    integrations_per_tenant: 5,
    storage_gb: 1,
  },
  professional: {
    messages_per_month: 100000,
    api_calls_per_day: 10000,
    flows_per_tenant: 100,
    integrations_per_tenant: 20,
    storage_gb: 10,
  },
  enterprise: {
    messages_per_month: Infinity,
    api_calls_per_day: Infinity,
    flows_per_tenant: Infinity,
    integrations_per_tenant: Infinity,
    storage_gb: Infinity,
  },
};

export class UsageTracker {
  private readonly PREFIX = 'usage:';
  private readonly MONTH_PREFIX = 'usage:month:';

  /**
   * Track API usage for a request
   */
  async trackUsage(
    tenantId: string,
    metric: keyof UsageMetrics,
    amount: number = 1
  ): Promise<boolean> {
    try {
      // Get tenant plan
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subscription: true },
      });

      if (!tenant) {
        console.warn(`[Usage] Tenant ${tenantId} not found`);
        return false;
      }

      const plan = (tenant.subscription || 'free') as keyof PlanLimits;
      const limits = PLAN_LIMITS[plan];

      // Check if we should track this metric
      let limitKey: keyof UsageLimits | null = null;

      switch (metric) {
        case 'messages_sent':
        case 'messages_received':
          limitKey = 'messages_per_month';
          break;
        case 'api_calls':
          limitKey = 'api_calls_per_day';
          break;
        case 'flows_executed':
          limitKey = 'flows_per_tenant';
          break;
        case 'integrations_used':
          limitKey = 'integrations_per_tenant';
          break;
        case 'storage_bytes':
          limitKey = 'storage_gb';
          break;
      }

      if (!limitKey) return true;

      const limit = limits[limitKey];

      // Check limits
      const isAllowed = await this.checkLimit(tenantId, metric, amount, limit);

      if (isAllowed) {
        // Record usage
        await this.recordUsage(tenantId, metric, amount);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Usage] Track usage error:', error);
      return true; // Fail open
    }
  }

  /**
   * Check if usage is within limits
   */
  private async checkLimit(
    tenantId: string,
    metric: keyof UsageMetrics,
    amount: number,
    limit: number
  ): Promise<boolean> {
    try {
      let currentUsage = 0;

      if (metric === 'messages_sent' || metric === 'messages_received') {
        // Monthly limit
        const monthKey = this.getMonthKey(tenantId, metric);
        currentUsage = getCacheValue(monthKey);
      } else if (metric === 'api_calls') {
        // Daily limit
        const dayKey = `${this.PREFIX}${tenantId}:daily:${metric}`;
        currentUsage = getCacheValue(dayKey);
      } else {
        // Tenant-wide limit
        const key = `${this.PREFIX}${tenantId}:${metric}`;
        currentUsage = getCacheValue(key);
      }

      return currentUsage + amount <= limit;
    } catch (error) {
      console.error('[Usage] Error checking limit:', error);
      return true; // Fail open
    }
  }

  /**
   * Record usage metric
   */
  private async recordUsage(
    tenantId: string,
    metric: keyof UsageMetrics,
    amount: number
  ): Promise<void> {
    try {
      let key: string;
      let ttl: number;

      if (metric === 'messages_sent' || metric === 'messages_received') {
        // Monthly tracking
        key = this.getMonthKey(tenantId, metric);
        ttl = this.getMonthTTL();
      } else if (metric === 'api_calls') {
        // Daily tracking
        key = `${this.PREFIX}${tenantId}:daily:${metric}`;
        ttl = 86400; // 24 hours
      } else {
        // Persistent tracking
        key = `${this.PREFIX}${tenantId}:${metric}`;
        ttl = 2592000; // 30 days
      }

      // Increment counter in cache
      incrCacheValue(key, amount, ttl);

      // Also persist to database for analytics
      await this.persistMetricToDB(tenantId, metric, amount);

    } catch (error) {
      console.error('[Usage] Error recording usage:', error);
    }
  }

  /**
   * Get current usage for a tenant
   */
  async getCurrentUsage(tenantId: string): Promise<Partial<UsageMetrics>> {
    try {
      const [
        messages_sent,
        messages_received,
        api_calls,
        flows_executed,
        integrations_used,
      ] = await Promise.all([
        this.getMetric(tenantId, 'messages_sent'),
        this.getMetric(tenantId, 'messages_received'),
        this.getMetric(tenantId, 'api_calls', true), // daily
        this.getMetric(tenantId, 'flows_executed'),
        this.getMetric(tenantId, 'integrations_used'),
      ]);

      return {
        messages_sent,
        messages_received,
        api_calls,
        flows_executed,
        integrations_used,
      };
    } catch (error) {
      console.error('[Usage] Error getting current usage:', error);
      return {};
    }
  }

  /**
   * Get usage for a specific metric
   */
  private async getMetric(
    tenantId: string,
    metric: keyof UsageMetrics,
    isDaily: boolean = false
  ): Promise<number> {
    try {
      let key: string;

      if (metric === 'messages_sent' || metric === 'messages_received') {
        key = this.getMonthKey(tenantId, metric);
      } else if (isDaily) {
        key = `${this.PREFIX}${tenantId}:daily:${metric}`;
      } else {
        key = `${this.PREFIX}${tenantId}:${metric}`;
      }

      return getCacheValue(key);
    } catch (error) {
      console.error('[Usage] Error getting metric:', error);
      return 0;
    }
  }

  /**
   * Get usage limits for a tenant
   */
  async getLimits(tenantId: string): Promise<UsageLimits> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subscription: true },
      });

      const plan = (tenant?.subscription || 'free') as keyof PlanLimits;
      return PLAN_LIMITS[plan];
    } catch (error) {
      console.error('[Usage] Error getting limits:', error);
      return PLAN_LIMITS.free;
    }
  }

  /**
   * Get usage report for a tenant
   */
  async getUsageReport(tenantId: string): Promise<{
    current: Partial<UsageMetrics>;
    limits: UsageLimits;
    percentages: Record<string, number>;
  }> {
    try {
      const [current, limits] = await Promise.all([
        this.getCurrentUsage(tenantId),
        this.getLimits(tenantId),
      ]);

      const percentages: Record<string, number> = {};

      if (current.messages_sent !== undefined) {
        percentages.messages = (current.messages_sent / limits.messages_per_month) * 100;
      }

      if (current.api_calls !== undefined) {
        percentages.api_calls = (current.api_calls / limits.api_calls_per_day) * 100;
      }

      if (current.flows_executed !== undefined) {
        percentages.flows = (current.flows_executed / limits.flows_per_tenant) * 100;
      }

      if (current.integrations_used !== undefined) {
        percentages.integrations = (current.integrations_used / limits.integrations_per_tenant) * 100;
      }

      return { current, limits, percentages };
    } catch (error) {
      console.error('[Usage] Error generating report:', error);
      throw error;
    }
  }

  /**
   * Reset usage for a tenant (monthly reset)
   */
  async resetMonthlyUsage(tenantId: string): Promise<void> {
    try {
      const keysToDelete = [
        this.getMonthKey(tenantId, 'messages_sent'),
        this.getMonthKey(tenantId, 'messages_received'),
      ];

      for (const key of keysToDelete) {
        delCacheKey(key);
      }

      console.log(`[Usage] Reset monthly usage for ${tenantId}`);
    } catch (error) {
      console.error('[Usage] Error resetting monthly usage:', error);
    }
  }

  /**
   * Reset daily usage for a tenant
   */
  async resetDailyUsage(tenantId: string): Promise<void> {
    try {
      const key = `${this.PREFIX}${tenantId}:daily:api_calls`;
      delCacheKey(key);

      console.log(`[Usage] Reset daily usage for ${tenantId}`);
    } catch (error) {
      console.error('[Usage] Error resetting daily usage:', error);
    }
  }

  /**
   * Upgrade tenant plan
   */
  async upgradePlan(tenantId: string, newPlan: keyof PlanLimits): Promise<void> {
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { subscription: newPlan },
      });

      console.log(`[Usage] Upgraded ${tenantId} to ${newPlan} plan`);
    } catch (error) {
      console.error('[Usage] Error upgrading plan:', error);
      throw error;
    }
  }

  /**
   * Internal: Get month key for metrics
   */
  private getMonthKey(tenantId: string, metric: string): string {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `${this.MONTH_PREFIX}${tenantId}:${monthYear}:${metric}`;
  }

  /**
   * Internal: Get month TTL (seconds until end of month)
   */
  private getMonthTTL(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.floor((nextMonth.getTime() - now.getTime()) / 1000);
  }

  /**
   * Internal: Persist metric to database
   */
  private async persistMetricToDB(
    tenantId: string,
    metric: keyof UsageMetrics,
    amount: number
  ): Promise<void> {
    try {
      // UsageMetric model doesn't exist in Prisma schema yet
    } catch (error) {
      console.error('[Usage] Error persisting to DB:', error);
    }
  }
}

/**
 * Middleware function for Next.js to enforce usage limits
 */
export async function usageTrackingMiddleware(request: NextRequest) {
  try {
    // Extract tenant from request (from auth or headers)
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.next();
    }

    const tracker = new UsageTracker();

    // Determine metric type based on endpoint
    const pathname = request.nextUrl.pathname;
    let metric: keyof UsageMetrics | null = null;

    if (pathname.includes('/api/message') || pathname.includes('/api/chat')) {
      metric = 'messages_sent';
    } else if (pathname.includes('/api/') && !pathname.includes('/auth')) {
      metric = 'api_calls';
    } else if (pathname.includes('/flow')) {
      metric = 'flows_executed';
    }

    if (metric) {
      const allowed = await tracker.trackUsage(tenantId, metric);

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            message: 'You have exceeded your usage limit for this metric',
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('[Usage Middleware] Error:', error);
    return NextResponse.next(); // Fail open
  }
}

export const usageTracker = new UsageTracker();
