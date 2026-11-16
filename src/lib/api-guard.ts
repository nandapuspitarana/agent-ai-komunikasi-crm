import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/auth';

/**
 * Central auth / tenant guard for API routes.
 *
 * `src/middleware.ts` does not run for `/api/*`, so every API route must
 * authenticate itself. Use these helpers instead of hand-rolled checks so that
 * tenant isolation is enforced the same way everywhere.
 */

export type AppRole = 'SUPER_ADMIN' | 'BUSINESS_PARTNER' | 'AGENT';

export type SessionUser = Session['user'];

type GuardOk = { ok: true; user: SessionUser };
type GuardFail = { ok: false; response: NextResponse };
export type GuardResult = GuardOk | GuardFail;

export const ROLES_MANAGE: AppRole[] = ['SUPER_ADMIN', 'BUSINESS_PARTNER'];

const deny = (status: 401 | 403 | 404, error: string): GuardFail => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

export function isSuperAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === 'SUPER_ADMIN';
}

/**
 * Require a logged-in user. By default the user must also belong to a tenant
 * (SUPER_ADMIN is exempt). Pass `roles` to restrict by role.
 */
export async function requireUser(
  opts: { roles?: AppRole[]; requireTenant?: boolean } = {}
): Promise<GuardResult> {
  const { roles, requireTenant = true } = opts;
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return deny(401, 'Unauthorized');
  if (roles && !roles.includes(user.role as AppRole)) return deny(403, 'Forbidden');
  if (requireTenant && !user.tenantId && !isSuperAdmin(user)) {
    return deny(403, 'No tenant assigned');
  }
  return { ok: true, user };
}

/** True when the user may act on resources owned by `tenantId`. */
export function canAccessTenant(user: SessionUser, tenantId: string | null | undefined): boolean {
  if (isSuperAdmin(user)) return true;
  return !!tenantId && !!user.tenantId && user.tenantId === tenantId;
}

/**
 * Prisma `where` fragment that scopes a query to the user's tenant.
 * SUPER_ADMIN gets an empty filter (all tenants).
 */
export function tenantScope(user: SessionUser): { tenantId?: string } {
  return isSuperAdmin(user) ? {} : { tenantId: user.tenantId as string };
}

/** Standard 404 used when a resource exists but belongs to another tenant (avoids leaking existence). */
export const notFound = (what = 'Not found') => NextResponse.json({ error: what }, { status: 404 });
