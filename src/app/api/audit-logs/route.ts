import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllAuditLogs } from '@/lib/audit-logger';
import { canAccessAdminPanel } from '@/lib/auth-utils';

// GET /api/audit-logs - Get all audit logs (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can view audit logs
    if (!canAccessAdminPanel(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await getAllAuditLogs(page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
