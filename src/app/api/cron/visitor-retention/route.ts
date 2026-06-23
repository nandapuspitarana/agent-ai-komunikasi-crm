import { NextResponse } from 'next/server';
import { cleanUpStaleVisitors } from '@/lib/visitor-service';

// This endpoint is intended to be called periodically (e.g., via Vercel Cron or a scheduler tool)
export async function GET(req: Request) {
  try {
    // Note: In a production environment, you should secure this route with a cron secret key
    // For example:
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

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
