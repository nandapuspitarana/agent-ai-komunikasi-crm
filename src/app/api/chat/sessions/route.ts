import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Super admins can see all tenant chats, others see only their tenant's chats
    const whereClause = session.user.role === 'SUPER_ADMIN'
      ? {}
      : { tenantId: session.user.tenantId || 'default-tenant' };

    // Fetch active chat sessions
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        ...whereClause,
        status: {
          in: ['bot', 'agent', 'queue'] // Active statuses
        }
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response for the frontend
    const formattedSessions = chatSessions.map(session => {
      const lastMessage = session.messages[session.messages.length - 1];
      return {
        id: session.id,
        contactId: session.contactId,
        channel: session.channel,
        status: session.status,
        createdAt: session.createdAt,
        messages: session.messages.map(msg => ({
          id: msg.id,
          text: msg.content,
          sender: msg.senderType === 'user' ? 'user' : 'agent',
          timestamp: msg.createdAt
        })),
        preview: lastMessage ? lastMessage.content : 'No messages yet',
        time: session.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}