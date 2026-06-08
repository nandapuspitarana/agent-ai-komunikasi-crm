import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: {
        handoffAgent: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        flows: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error: any) {
    console.error('[Tenant GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, aiSystemPrompt, handoffAgentId, activeFlowId, themeBrandColor, themeUserBubbleColor, themeBotBubbleColor } = body;

    const updatedTenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        name,
        aiSystemPrompt,
        handoffAgentId,
        activeFlowId,
        themeBrandColor,
        themeUserBubbleColor,
        themeBotBubbleColor,
      },
    });

    return NextResponse.json({ tenant: updatedTenant });
  } catch (error: any) {
    console.error('[Tenant PUT Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
