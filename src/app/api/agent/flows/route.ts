import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

// GET /api/agent/flows - Get all flows for current user's tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let tenantId = (session.user as any).tenantId;

    // If user doesn't have a tenant, find their default tenant
    if (!tenantId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      tenantId = user?.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ flows: [] });
    }

    const flows = await prisma.flow.findMany({
      where: { tenantId },
      include: {
        intents: {
          select: {
            id: true,
            name: true,
            trainingPhrases: true,
            responseType: true,
            response: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ flows });
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }
}
