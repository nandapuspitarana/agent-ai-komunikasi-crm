import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenant_id');

    // Only SUPER_ADMIN can query arbitrary tenants; regular users are pinned to their tenantId
    let activeTenantId = tenantId;
    if (session.user.role === 'SUPER_ADMIN' && requestedTenantId) {
      activeTenantId = requestedTenantId;
    }

    if (!activeTenantId) {
      activeTenantId = 'system';
    }

    // Validate and clamp days (1 - 28)
    const rawDays = parseInt(searchParams.get('days') || '7', 10);
    const days = Math.min(Math.max(isNaN(rawDays) ? 7 : rawDays, 1), 28);

    const proxyUrl = process.env.AGENT_PROXY_URL || 'http://127.0.0.1:8200';
    const serviceToken = process.env.OBSERVABILITY_SERVICE_TOKEN;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (serviceToken) {
      headers['Authorization'] = `Bearer ${serviceToken}`;
    }

    const response = await fetch(
      `${proxyUrl}/api/v1/observability/dashboard?tenant_id=${encodeURIComponent(activeTenantId)}&days=${days}`,
      {
        headers,
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('FastAPI observability error:', err);
      return NextResponse.json({ error: 'Failed to fetch AI stats from proxy' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching AI cost stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
