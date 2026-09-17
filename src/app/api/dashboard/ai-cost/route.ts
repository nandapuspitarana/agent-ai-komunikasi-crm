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

    // Default to a specific tenant for Super Admin if they want to view stats,
    // or just use their tenantId (which might be system). For this CRM, 
    // we use the logged in user's tenantId.
    const activeTenantId = tenantId || 'system';
    
    // Get query params
    const { searchParams } = new URL(req.url);
    const days = searchParams.get('days') || '7';

    const proxyUrl = process.env.AGENT_PROXY_URL || 'http://127.0.0.1:8200';
    const response = await fetch(`${proxyUrl}/api/v1/observability/dashboard?tenant_id=${activeTenantId}&days=${days}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('FastAPI error:', err);
      return NextResponse.json({ error: 'Failed to fetch AI stats from proxy' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching AI cost stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
