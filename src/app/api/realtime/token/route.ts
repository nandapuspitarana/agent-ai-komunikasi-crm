import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-guard';
import { realtimeJwtConfigured, signRealtimeToken } from '@/lib/supabase-jwt';

// Realtime token for the dashboard (inbox, notifications). Scoped to the
// user's tenant; SUPER_ADMIN gets every tenant.
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  if (!realtimeJwtConfigured()) {
    return NextResponse.json({ error: 'Realtime is not configured' }, { status: 503 });
  }

  const { user } = guard;
  const result = signRealtimeToken({
    kind: 'dashboard',
    userId: user.id,
    crmRole: user.role,
    tenantId: user.tenantId ?? null,
  });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
