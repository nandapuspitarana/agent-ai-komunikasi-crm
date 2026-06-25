import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageRouter } from '@/modules/chat-engine/router';

import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing sessionId or content' }, { status: 400 });
    }

    // Verify session belongs to tenant
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession || chatSession.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify assigned agent
    if (chatSession.status === 'agent' && chatSession.assignedAgentId && chatSession.assignedAgentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden. This chat is handled by another agent.' }, { status: 403 });
    }

    // Save agent message to database
    const newMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'agent',
        content
      }
    });

    // Fetch agent's real name and avatar from the database
    const agentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, avatarUrl: true }
    });
    const agentName = agentUser?.name || session.user.name || 'Agent';

    // Automatically claim session if it was in 'bot' or 'queue' mode
    let updatedStatus = chatSession.status;
    if (chatSession.status === 'bot' || chatSession.status === 'queue') {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          status: 'agent',
          assignedAgentId: session.user.id
        }
      });
      updatedStatus = 'agent';

      // Create a system message about agent joining
      await prisma.message.create({
        data: {
          sessionId,
          senderType: 'system',
          content: `Agen ${agentName} bergabung ke percakapan.`
        }
      });
    }

    // Emit Socket.io events directly to widget and inbox agent dashboards
    // Supabase Realtime handles this automatically, but we add Broadcast fallback.
    try {
      const { supabase } = await import('@/lib/supabase-client');
      const channel = supabase.channel(`session_${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: newMessage.id,
          senderType: 'agent',
          content: content,
          createdAt: newMessage.createdAt.toISOString()
        }
      });
    } catch (err) {
      console.error('[Broadcast] Failed to emit agent message to widget:', err);
    }

    return NextResponse.json({ success: true, message: newMessage, status: updatedStatus });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}