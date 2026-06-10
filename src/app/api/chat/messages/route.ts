import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { messageRouter } from '@/modules/chat-engine/router';

const prisma = new PrismaClient();

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

    // Save agent message to database
    const newMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'agent',
        content
      }
    });

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
          content: `Agen ${session.user.name || 'kami'} bergabung ke percakapan.`
        }
      });
    }

    // Emit Socket.io events directly to widget and inbox agent dashboards
    const io = (global as any).socketIO;
    if (io) {
      // If session was claimed, emit agent_joined event
      if (chatSession.status === 'bot' || chatSession.status === 'queue') {
        io.to(`session:${sessionId}`).emit('agent_joined', {
          agentId: session.user.id,
          agentName: session.user.name || 'Agent',
        });
        io.to(`widget:${sessionId}`).emit('agent_joined', {
          agentId: session.user.id,
          agentName: session.user.name || 'Agent',
        });
        
        io.to(`inbox:${tenantId}`).emit('session_updated', {
          sessionId,
          status: 'agent',
          assignedAgentId: session.user.id,
          agentName: session.user.name || 'Agent',
        });
      }

      // Get agent avatar
      const agentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true }
      });

      // Emit agent message
      io.to(`session:${sessionId}`).emit('agent_message', {
        sessionId,
        message: content,
        senderType: 'agent',
        timestamp: newMessage.createdAt.toISOString(),
        avatar: agentUser?.avatarUrl || null
      });
      io.to(`widget:${sessionId}`).emit('agent_message', {
        sessionId,
        message: content,
        senderType: 'agent',
        timestamp: newMessage.createdAt.toISOString(),
        avatar: agentUser?.avatarUrl || null
      });
    }

    return NextResponse.json({ success: true, message: newMessage, status: updatedStatus });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}