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

    const assets = await prisma.asset.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('[Asset GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Asset data is required' }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        tenantId: session.user.tenantId,
        name: name || `Asset-${Date.now()}`,
        data,
      },
    });

    return NextResponse.json({ asset });
  } catch (error: any) {
    console.error('[Asset POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
