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

    return NextResponse.json({
      status: 'success',
      config: {
        name: tenant.name,
        primaryColor: '#2563eb', // Mocked for now
        initialFlow: tenant.flows[0] || null
      }
    });

  } catch (error) {
    console.error('Widget init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
