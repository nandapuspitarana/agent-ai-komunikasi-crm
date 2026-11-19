import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/overview — super-admin only; Prisma aggregates merged with proxy token usage.
 */

const prismaMock = vi.hoisted(() => ({
  tenant: { findMany: vi.fn() },
  user: { groupBy: vi.fn(), count: vi.fn() },
  visitorProfile: { groupBy: vi.fn(), count: vi.fn() },
  chatSession: { groupBy: vi.fn(), count: vi.fn() },
  $queryRaw: vi.fn(),
}));
const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/auth', () => ({ auth: authMock }));

import { GET } from '@/app/api/admin/overview/route';

const fetchMock = vi.fn();

const asRole = (role: string, tenantId: string | null = null) =>
  authMock.mockResolvedValue({ user: { id: `u-${role}`, role, tenantId, email: 'x@example.test' } });

const req = (qs = '?from=2026-11-01&to=2026-11-30') =>
  new NextRequest(`http://localhost/api/admin/overview${qs}`);

const usageRow = (tenantId: string | null, totalTokens: number, costUsd: number) => ({
  tenant_id: tenantId,
  input_tokens: totalTokens - 10,
  cached_input_tokens: 0,
  output_tokens: 10,
  total_tokens: totalTokens,
  cost_usd: costUsd,
  request_count: 3,
  error_count: 0,
  unpriced_count: 0,
  by_type: [],
  by_model: [],
});

const proxyBody = (tenants: ReturnType<typeof usageRow>[]) => ({
  period: { from: '2026-11-01', to: '2026-11-30', tz: 'Asia/Jakarta' },
  totals: {
    input_tokens: 1500 - 10 * tenants.length,
    cached_input_tokens: 0,
    output_tokens: 10 * tenants.length,
    total_tokens: tenants.reduce((s, t) => s + t.total_tokens, 0),
    cost_usd: tenants.reduce((s, t) => s + t.cost_usd, 0),
    request_count: 3 * tenants.length,
    error_count: 0,
    unpriced_count: 0,
  },
  tenants,
  by_day: [{ date: '2026-11-02', total_tokens: 1500, cost_usd: 0.3, request_count: 6 }],
  unpriced_models: [],
  retention: { metrics_days: 90, oldest_available: '2026-10-01T00:00:00Z' },
});

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

/** Fixtures keyed off what is being queried, so the tests do not depend on call order. */
function seedPrisma() {
  prismaMock.tenant.findMany.mockResolvedValue([
    { id: 't1', name: 'PT Alpha', subscription: 'pro', aiEnabled: true, createdAt: new Date('2026-01-05T00:00:00Z') },
    { id: 't2', name: 'PT Beta', subscription: 'free', aiEnabled: false, createdAt: new Date('2026-02-10T00:00:00Z') },
  ]);
  prismaMock.user.groupBy.mockResolvedValue([
    { tenantId: 't1', role: 'BUSINESS_PARTNER', isActive: true, _count: 1 },
    { tenantId: 't1', role: 'AGENT', isActive: true, _count: 3 },
    { tenantId: 't1', role: 'AGENT', isActive: false, _count: 1 },
    { tenantId: 't2', role: 'AGENT', isActive: true, _count: 2 },
    { tenantId: null, role: 'SUPER_ADMIN', isActive: true, _count: 1 },
  ]);
  prismaMock.user.count.mockImplementation(async (args: any) => (args?.where?.lastLoginAt ? 4 : 2));
  prismaMock.visitorProfile.groupBy.mockImplementation(async (args: any) =>
    args?.where?.createdAt
      ? [{ tenantId: 't1', _count: 5 }]
      : [
          { tenantId: 't1', _count: 20 },
          { tenantId: 't2', _count: 7 },
        ]
  );
  prismaMock.visitorProfile.count.mockResolvedValue(6);
  prismaMock.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = Array.from(strings).join(' ');
    if (sql.includes('AS "senderType"')) {
      return [
        { tenantId: 't1', senderType: 'user', n: 40 },
        { tenantId: 't1', senderType: 'bot', n: 38 },
        { tenantId: 't2', senderType: 'user', n: BigInt(9) },
      ];
    }
    if (sql.includes('MAX(')) {
      return [{ tenantId: 't1', lastAt: new Date('2026-11-18T10:00:00Z') }];
    }
    if (sql.includes(`m."senderType" = 'agent'`)) return [{ tenantId: 't1', n: 2 }];
    if (sql.includes('s."channel"')) {
      return [
        { tenantId: 't1', channel: 'widget', n: 10 },
        { tenantId: 't1', channel: 'whatsapp', n: 5 },
        { tenantId: 't2', channel: 'widget', n: 3 },
      ];
    }
    if (sql.includes('GROUP BY s."tenantId"')) {
      return [
        { tenantId: 't1', n: 12 },
        { tenantId: 't2', n: 3 },
      ];
    }
    // platform-wide distinct (tenantId, contactId): <= the per-tenant sum (15)
    return [{ n: 14 }];
  });
}

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    typeof m === 'function' ? m.mockReset() : Object.values(m).forEach((fn: any) => fn.mockReset())
  );
  authMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/admin/overview — access control', () => {
  it('rejects anonymous', async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it.each(['BUSINESS_PARTNER', 'AGENT'])('rejects %s', async (role) => {
    asRole(role, 'tA');
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.groupBy).not.toHaveBeenCalled();
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects bad period', async () => {
    asRole('SUPER_ADMIN');
    const res = await GET(req('?from=2026-11-30&to=2026-11-01'));
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
    expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/overview — data', () => {
  beforeEach(() => {
    asRole('SUPER_ADMIN');
    seedPrisma();
  });

  it('merges proxy usage', async () => {
    fetchMock.mockResolvedValue(
      okResponse(proxyBody([usageRow('t1', 1000, 0.25), usageRow('ghost-tenant-id', 500, 0.05)]))
    );
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.period).toEqual({ from: '2026-11-01', to: '2026-11-30', tz: 'Asia/Jakarta' });
    expect(body.tenants).toHaveLength(3);
    expect(body.ai.status).toBe('ok');
    expect(body.ai.byDay).toHaveLength(1);
    expect(body.ai.unpricedModels).toEqual([]);
    expect(body.ai.oldestAvailable).toBe('2026-10-01T00:00:00Z');

    const sum = body.tenants.reduce((s: number, t: any) => s + t.ai.totalTokens, 0);
    expect(sum).toBe(body.ai.totals.total_tokens);

    // sorted by cost desc: PT Alpha (0.25), unknown (0.05), PT Beta (0)
    expect(body.tenants.map((t: any) => t.id)).toEqual(['t1', 'ghost-tenant-id', 't2']);
    expect(body.tenants[1].known).toBe(false);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/v1/observability/usage-by-tenant');
    expect(url).toContain('from=2026-11-01&to=2026-11-30&tz=Asia%2FJakarta');
    const init = fetchMock.mock.calls[0][1];
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('builds platform and per-tenant stats from Prisma aggregates', async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([usageRow('t1', 1000, 0.25)])));
    const body = await (await GET(req())).json();

    expect(body.platform.tenants).toEqual({ total: 2, byPlan: { pro: 1, free: 1 }, aiEnabled: 1 });
    expect(body.platform.staff).toEqual({
      total: 8,
      active: 7,
      byRole: { BUSINESS_PARTNER: 1, AGENT: 6, SUPER_ADMIN: 1 },
      newInPeriod: 2,
      loggedInPeriod: 4,
    });
    expect(body.platform.endUsers).toEqual({
      activeInPeriod: 14,
      storedProfiles: 27,
      newProfilesInPeriod: 5,
      hotLeads: 6,
    });
    expect(body.platform.activity).toEqual({
      sessions: 18,
      sessionsByChannel: { widget: 13, whatsapp: 5 },
      handoffs: 2,
      messages: 87,
      messagesBySender: { user: 49, bot: 38 },
    });

    const alpha = body.tenants.find((t: any) => t.id === 't1');
    expect(alpha).toMatchObject({
      name: 'PT Alpha',
      plan: 'pro',
      aiEnabled: true,
      createdAt: '2026-01-05T00:00:00.000Z',
      lastActivityAt: '2026-11-18T10:00:00.000Z',
      staff: { total: 5, active: 4, byRole: { BUSINESS_PARTNER: 1, AGENT: 4 } },
      endUsers: { activeInPeriod: 12, storedProfiles: 20, newProfilesInPeriod: 5 },
      activity: { sessions: 15, messages: 78, handoffs: 2 },
      known: true,
    });
    const beta = body.tenants.find((t: any) => t.id === 't2');
    expect(beta.lastActivityAt).toBeNull();
    expect(beta.activity).toEqual({ sessions: 3, messages: 9, handoffs: 0 });
  });

  it('derives activity from messages in the period (reused sessions count), via tagged $queryRaw', async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([])));
    await GET(req());

    // ChatSession is never grouped by its own createdAt any more: a reused session must still count.
    expect(prismaMock.chatSession.groupBy).not.toHaveBeenCalled();

    const sqls = prismaMock.$queryRaw.mock.calls.map((c: any[]) => Array.from(c[0] as TemplateStringsArray).join(' '));
    expect(sqls).toHaveLength(6);
    for (const sql of sqls) {
      expect(sql).toContain('"crm_agent_Message"');
      expect(sql).toContain('JOIN "crm_agent_ChatSession"');
    }
    const find = (needle: string) => sqls.find((s) => s.includes(needle)) as string;
    expect(find('s."channel"')).toContain('COUNT(DISTINCT m."sessionId")');
    // Handoff = sessions a human agent actually handled (agent messages) in the period.
    // Nothing ever writes ChatSession.handoffRequested, so the query must not reference it.
    const handoffSql = find(`m."senderType" = 'agent'`);
    expect(handoffSql).toContain('COUNT(DISTINCT m."sessionId")');
    expect(handoffSql).toContain('GROUP BY s."tenantId"');
    expect(handoffSql).not.toContain('handoffRequested');
    for (const sql of sqls) expect(sql).not.toContain('handoffRequested');
    expect(find('MAX(m."createdAt")')).not.toContain('>=');
    const activeSqls = sqls.filter((s) => s.includes('"contactId"'));
    expect(activeSqls).toHaveLength(2);
    for (const sql of activeSqls) expect(sql).toContain(`m."senderType" = 'user'`);
  });

  it(`binds every windowed bound as timestamptz AT TIME ZONE 'UTC' (independent of the DB session TimeZone)`, async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([])));
    await GET(req());

    const sqls = prismaMock.$queryRaw.mock.calls.map((c: any[]) => Array.from(c[0] as TemplateStringsArray).join(' '));
    // Join with '?' so the parameter placeholders are visible in the assertions.
    const windowed = prismaMock.$queryRaw.mock.calls
      .map((c: any[]) => Array.from(c[0] as TemplateStringsArray).join('?'))
      .filter((s: string) => !s.includes('MAX('));
    expect(windowed).toHaveLength(5);
    for (const sql of windowed) {
      expect(sql).toContain(`m."createdAt" >= (?::timestamptz AT TIME ZONE 'UTC')`);
      expect(sql).toContain(`m."createdAt" < (?::timestamptz AT TIME ZONE 'UTC')`);
      expect(sql.split(`AT TIME ZONE 'UTC'`).length - 1).toBe(2);
    }
  });

  it('passes the period start/end instants as $queryRaw values', async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([])));
    await GET(req());

    const start = new Date('2026-10-31T17:00:00.000Z');
    const end = new Date('2026-11-30T17:00:00.000Z');
    let periodQueries = 0;
    for (const call of prismaMock.$queryRaw.mock.calls as any[][]) {
      const sql = Array.from(call[0] as TemplateStringsArray).join(' ');
      if (sql.includes('MAX(')) continue; // last activity is all-time
      periodQueries += 1;
      const values = call.slice(1);
      expect(values.some((v) => v instanceof Date && v.getTime() === start.getTime())).toBe(true);
      expect(values.some((v) => v instanceof Date && v.getTime() === end.getTime())).toBe(true);
    }
    expect(periodQueries).toBe(5);
  });

  it('does not return conversation content', async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([])));
    const text = JSON.stringify(await (await GET(req())).json());
    expect(text).not.toMatch(/"content"|"message"\s*:/);
  });

  const expectUnavailable = async (res: Response) => {
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ai.status).toBe('unavailable');
    expect(typeof body.ai.error).toBe('string');
    expect(body.ai.totals).toBeUndefined();
    expect(body.tenants).toHaveLength(2);
    for (const t of body.tenants) expect(t.ai).toBeNull();
    expect(body.platform.staff.total).toBe(8);
    expect(body.tenants.map((t: any) => t.name)).toEqual(['PT Alpha', 'PT Beta']);
  };

  it('proxy down', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expectUnavailable(await GET(req()));
  });

  it('proxy timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    await expectUnavailable(await GET(req()));
  });

  it('proxy non-2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    await expectUnavailable(await GET(req()));
  });

  it('proxy bad JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });
    await expectUnavailable(await GET(req()));
  });

  it('does not load whole tables', async () => {
    fetchMock.mockResolvedValue(okResponse(proxyBody([])));
    await GET(req());
    expect((prismaMock.chatSession as any).findMany).toBeUndefined();
    expect((prismaMock as any).message).toBeUndefined();
  });
});
