import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { realtimeJwtConfigured, signRealtimeToken } from '@/lib/supabase-jwt';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: corsHeaders });

/**
 * Realtime token for one widget chat session.
 *
 * The session id (a random UUID returned only to the visitor who created the
 * session) is the capability here, the same as for GET /api/widget/message
 * history. The token only lets the holder receive changes of that session.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, sessionId } = await req.json().catch(() => ({}));
    if (typeof tenantId !== 'string' || typeof sessionId !== 'string' || !tenantId || !sessionId) {
      return reply({ error: 'tenantId and sessionId are required' }, 400);
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, tenantId: true },
    });
    if (!session || session.tenantId !== tenantId) {
      return reply({ error: 'Session not found' }, 404);
    }

    if (!realtimeJwtConfigured()) {
      return reply({ error: 'Realtime is not configured' }, 503);
    }

    return reply(signRealtimeToken({ kind: 'widget', chatSessionId: session.id }));
  } catch (error) {
    console.error('[Widget Realtime Token] Error:', error);
    return reply({ error: 'Internal server error' }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
