import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession || chatSession.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update status to closed
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        status: 'closed',
        closedAt: new Date()
      }
    });

    // Create system message
    await prisma.message.create({
      data: {
        sessionId,
        senderType: 'system',
        content: 'Percakapan telah ditutup oleh agen.'
      }
    });

    // Emit Socket.io events
    // Supabase Realtime handles this automatically.

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Error closing session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
