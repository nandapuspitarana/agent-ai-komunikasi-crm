import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = (await params).sessionId;
    const tenantId = session.user.tenantId;

    // Check if session exists and belongs to the agent's tenant
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!chatSession || chatSession.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session status to 'agent' and assign agent id
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'agent',
        assignedAgentId: session.user.id,
      },
    });

    // Fetch agent's real name from the database
    const agentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    });
    const agentName = agentUser?.name || session.user.name || 'Agent';

    // Create system message about agent joining
    await prisma.message.create({
      data: {
        sessionId,
        senderType: 'system',
        content: `Agen ${agentName} bergabung ke percakapan.`,
      },
    });

    // Emit Socket.io event to notify widget
    // Supabase Realtime handles this automatically.

    return NextResponse.json({
      success: true,
      status: 'agent',
      assignedAgentId: session.user.id,
    });
  } catch (error) {
    console.error('Error claiming chat session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
