import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireUser, canAccessTenant, ROLES_MANAGE } from '@/lib/api-guard';

// GET /api/flows/[flowId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { intents: true }
    });

    if (!flow || !canAccessTenant(guard.user, flow.tenantId)) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

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
    const guard = await requireUser({ roles: ROLES_MANAGE });
    if (!guard.ok) return guard.response;

    const flow = await prisma.flow.findUnique({
      where: { id: flowId }
    });

    if (!flow || !canAccessTenant(guard.user, flow.tenantId)) {
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
