import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

// Force recompile

// GET /api/flows/[flowId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { intents: true }
    });

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Optional: Validate tenant ownership here if needed
    
    return NextResponse.json(flow);
  } catch (error) {
    console.error('Error fetching flow:', error);
    return NextResponse.json({ error: 'Failed to fetch flow' }, { status: 500 });
  }
}

// DELETE /api/flows/[flowId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flow = await prisma.flow.findUnique({
      where: { id: flowId }
    });

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Intents will be automatically deleted if they have cascade on delete
    // But since it's a manual deletion in Prisma, we do a transaction
    await prisma.$transaction([
      prisma.intent.deleteMany({
        where: { flowId: flowId }
      }),
      prisma.flow.delete({
        where: { id: flowId }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
  }
}
