import { NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const resolvedParams = await params;
    const visitorId = resolvedParams.id;

    const visitor = await prisma.visitorProfile.findUnique({
      where: { id: visitorId },
    });

    if (!visitor || visitor.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    // Fetch related chat sessions
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        tenantId,
        contactId: visitor.contactId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    return NextResponse.json({
      visitor,
      sessions: chatSessions
    });
  } catch (error: any) {
    console.error('Error in GET /api/visitors/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
