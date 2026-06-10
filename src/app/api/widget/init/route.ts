import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { websiteUrl, tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        flows: {
          take: 1,
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const flowConfig = tenant.flows[0]?.config as any;

    return NextResponse.json({
      status: 'success',
      config: {
        name: tenant.name,
        primaryColor: tenant.themeBrandColor || '#2563eb', // Use tenant color
        logo: tenant.themeBrandLogo || null,
        botAvatarUrl: flowConfig?.botAvatarUrl || tenant.botAvatarUrl || null,
        initialFlow: tenant.flows[0] || null
      }
    });

  } catch (error) {
    console.error('Widget init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
