import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'BUSINESS_PARTNER') {
      return NextResponse.json({ error: 'Forbidden. Only Admins can reassign chats.' }, { status: 403 });
    }

    const body = await req.json();
    const { assignedAgentId } = body;

    if (!assignedAgentId) {
      return NextResponse.json({ error: 'Missing assignedAgentId' }, { status: 400 });
    }

    // Verify chat session exists and belongs to the correct tenant
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    if (session.user.role !== 'SUPER_ADMIN' && chatSession.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify target user is a valid agent
    const targetAgent = await prisma.user.findUnique({
      where: { id: assignedAgentId },
    });

    if (!targetAgent || (session.user.role !== 'SUPER_ADMIN' && targetAgent.tenantId !== session.user.tenantId)) {
      return NextResponse.json({ error: 'Invalid agent selected' }, { status: 400 });
    }

    // Update the session
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        assignedAgentId,
        status: 'agent' // Ensure status is 'agent' even if it was in queue
      },
    });

    // We do NOT use global.socketIO here because Next.js App Router API 
    // routes often don't have access to the same global namespace as the custom server.
    // The client handles Socket.io notification via its own socket instance.

    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error reassigning chat session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
