import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { cleanUpStaleVisitors } from '@/lib/visitor-service';

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret configured, no access
  const given = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Called periodically by a scheduler with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanUpStaleVisitors();

    if (result.success) {
      return NextResponse.json({
        message: 'Visitor retention cleanup completed successfully',
        deletedCount: result.deletedCount
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[Cron API] Error running visitor retention:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
