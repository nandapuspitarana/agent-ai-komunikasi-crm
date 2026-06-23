import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tenantId = (session.user as any).tenantId;
    if (!tenantId && (session.user as any).role === 'SUPER_ADMIN') {
      const firstTenant = await prisma.tenant.findFirst();
      tenantId = firstTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: No tenant assigned' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
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
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tenantId = (session.user as any).tenantId;
    if (!tenantId && (session.user as any).role === 'SUPER_ADMIN') {
      const firstTenant = await prisma.tenant.findFirst();
      tenantId = firstTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: No tenant assigned' }, { status: 401 });
    }

    const body = await req.json();
    const { name, aiSystemPrompt, handoffAgentId, activeFlowId, themeBrandColor, themeUserBubbleColor, themeBotBubbleColor, themeBrandLogo, botAvatarUrl, widgetPosition, widgetIconUrl, visitorConfig } = body;

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        aiSystemPrompt,
        handoffAgentId,
        activeFlowId,
        themeBrandColor,
        themeUserBubbleColor,
        themeBotBubbleColor,
        themeBrandLogo,
        botAvatarUrl,
        widgetPosition,
        widgetIconUrl,
        ...(visitorConfig !== undefined && { visitorConfig }),
      },
    });

    return NextResponse.json({ tenant: updatedTenant });
  } catch (error: any) {
    console.error('[Tenant PUT Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
