import { prisma } from '@/lib/prisma';
import type { BillingPeriod, TenantRow } from '@/lib/admin-billing';

// Prisma-only aggregation for the super-admin billing dashboard.
// Only count / groupBy / aggregate / $queryRaw aggregates: never loads ChatSession or Message rows.
//
// Conversation activity is derived from MESSAGES created in the period, not from ChatSession.createdAt:
// WhatsApp keeps one permanent session per (tenant, contact) and the widget reuses open sessions, so
// counting sessions by their creation date would miss returning users. Hence:
//   - active users    = distinct contacts that sent a user message in the period
//   - sessions        = distinct sessions that have any message in the period
//   - handoffs        = those sessions that are flagged handoffRequested
//   - last activity   = latest message of the tenant (all time)

export type PlatformStats = {
  tenants: { total: number; byPlan: Record<string, number>; aiEnabled: number };
  staff: {
    total: number;
    active: number;
    byRole: Record<string, number>;
    newInPeriod: number;
    loggedInPeriod: number;
  };
  endUsers: { activeInPeriod: number; storedProfiles: number; newProfilesInPeriod: number; hotLeads: number };
  activity: {
    sessions: number;
    sessionsByChannel: Record<string, number>;
    handoffs: number;
    messages: number;
    messagesBySender: Record<string, number>;
  };
};

type TenantCountRow = { tenantId: string; n: number | bigint };
type TenantSenderRow = { tenantId: string; senderType: string; n: number | bigint };
type TenantChannelRow = { tenantId: string; channel: string; n: number | bigint };
type TenantLastRow = { tenantId: string; lastAt: Date | null };

const add = (record: Record<string, number>, key: string, n: number) => {
  record[key] = (record[key] ?? 0) + n;
};

export async function getAdminStats(
  period: BillingPeriod
): Promise<{ platform: PlatformStats; tenants: TenantRow[] }> {
  const { start, end } = period;
  const inPeriod = { gte: start, lt: end };

  const [
    tenantRows,
    staffGroups,
    staffNew,
    staffLoggedIn,
    profilesStored,
    profilesNew,
    hotLeads,
    activeUsersByTenant,
    activeUsersPlatform,
    sessionGroups,
    handoffGroups,
    lastActivity,
    messageGroups,
  ] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, name: true, subscription: true, aiEnabled: true, createdAt: true },
    }),
    prisma.user.groupBy({ by: ['tenantId', 'role', 'isActive'], _count: true }),
    prisma.user.count({ where: { createdAt: inPeriod } }),
    prisma.user.count({ where: { lastLoginAt: inPeriod } }),
    prisma.visitorProfile.groupBy({ by: ['tenantId'], _count: true }),
    prisma.visitorProfile.groupBy({ by: ['tenantId'], where: { createdAt: inPeriod }, _count: true }),
    prisma.visitorProfile.count({ where: { leadClassification: 'hot_lead' } }),
    prisma.$queryRaw<TenantCountRow[]>`
      SELECT s."tenantId" AS "tenantId", COUNT(DISTINCT s."contactId")::int AS n
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end} AND m."senderType" = 'user'
      GROUP BY s."tenantId"`,
    prisma.$queryRaw<Array<{ n: number | bigint }>>`
      SELECT COUNT(DISTINCT (s."tenantId", s."contactId"))::int AS n
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end} AND m."senderType" = 'user'`,
    prisma.$queryRaw<TenantChannelRow[]>`
      SELECT s."tenantId" AS "tenantId", s."channel" AS "channel", COUNT(DISTINCT m."sessionId")::int AS n
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end}
      GROUP BY s."tenantId", s."channel"`,
    prisma.$queryRaw<TenantCountRow[]>`
      SELECT s."tenantId" AS "tenantId", COUNT(DISTINCT m."sessionId")::int AS n
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end} AND s."handoffRequested" = true
      GROUP BY s."tenantId"`,
    prisma.$queryRaw<TenantLastRow[]>`
      SELECT s."tenantId" AS "tenantId", MAX(m."createdAt") AS "lastAt"
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      GROUP BY s."tenantId"`,
    prisma.$queryRaw<TenantSenderRow[]>`
      SELECT s."tenantId" AS "tenantId", m."senderType" AS "senderType", COUNT(*)::int AS n
      FROM "crm_agent_Message" m
      JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId"
      WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end}
      GROUP BY s."tenantId", m."senderType"`,
  ]);

  const platform: PlatformStats = {
    tenants: { total: tenantRows.length, byPlan: {}, aiEnabled: 0 },
    staff: { total: 0, active: 0, byRole: {}, newInPeriod: staffNew, loggedInPeriod: staffLoggedIn },
    endUsers: {
      activeInPeriod: Number(activeUsersPlatform[0]?.n ?? 0),
      storedProfiles: 0,
      newProfilesInPeriod: 0,
      hotLeads,
    },
    activity: { sessions: 0, sessionsByChannel: {}, handoffs: 0, messages: 0, messagesBySender: {} },
  };

  const rows = new Map<string, TenantRow>();
  for (const t of tenantRows) {
    add(platform.tenants.byPlan, t.subscription, 1);
    if (t.aiEnabled) platform.tenants.aiEnabled += 1;
    rows.set(t.id, {
      id: t.id,
      name: t.name,
      plan: t.subscription,
      aiEnabled: t.aiEnabled,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      lastActivityAt: null,
      staff: { total: 0, active: 0, byRole: {} },
      endUsers: { activeInPeriod: 0, storedProfiles: 0, newProfilesInPeriod: 0 },
      activity: { sessions: 0, messages: 0, handoffs: 0 },
      ai: null,
      known: true,
    });
  }

  // Staff without a tenant (SUPER_ADMIN) only count toward the platform totals.
  for (const g of staffGroups) {
    const n = Number(g._count);
    platform.staff.total += n;
    if (g.isActive) platform.staff.active += n;
    add(platform.staff.byRole, g.role, n);
    const row = g.tenantId ? rows.get(g.tenantId) : undefined;
    if (row) {
      row.staff.total += n;
      if (g.isActive) row.staff.active += n;
      add(row.staff.byRole, g.role, n);
    }
  }

  for (const r of activeUsersByTenant) {
    const row = rows.get(r.tenantId);
    if (row) row.endUsers.activeInPeriod = Number(r.n);
  }

  for (const g of profilesStored) {
    const n = Number(g._count);
    platform.endUsers.storedProfiles += n;
    const row = rows.get(g.tenantId);
    if (row) row.endUsers.storedProfiles = n;
  }
  for (const g of profilesNew) {
    const n = Number(g._count);
    platform.endUsers.newProfilesInPeriod += n;
    const row = rows.get(g.tenantId);
    if (row) row.endUsers.newProfilesInPeriod = n;
  }

  for (const g of sessionGroups) {
    const n = Number(g.n);
    platform.activity.sessions += n;
    add(platform.activity.sessionsByChannel, g.channel, n);
    const row = rows.get(g.tenantId);
    if (row) row.activity.sessions += n;
  }
  for (const g of handoffGroups) {
    const n = Number(g.n);
    platform.activity.handoffs += n;
    const row = rows.get(g.tenantId);
    if (row) row.activity.handoffs = n;
  }
  for (const g of lastActivity) {
    const row = rows.get(g.tenantId);
    if (row && g.lastAt) row.lastActivityAt = new Date(g.lastAt).toISOString();
  }

  for (const g of messageGroups) {
    const n = Number(g.n);
    platform.activity.messages += n;
    add(platform.activity.messagesBySender, g.senderType, n);
    const row = rows.get(g.tenantId);
    if (row) row.activity.messages += n;
  }

  return { platform, tenants: Array.from(rows.values()) };
}
