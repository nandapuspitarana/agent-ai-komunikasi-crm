import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { canAccessAdminPanel } from '@/lib/auth-utils';
import { logAIAgentCreated, logAIAgentUpdated, logAIAgentDeleted } from '@/lib/audit-logger';

const prisma = new PrismaClient();

// GET /api/flows - Get all flows for tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('id');

    // If specific flow requested
    if (flowId) {
      const flow = await prisma.flow.findUnique({
        where: { id: flowId },
        include: { intents: true }
      });

      if (!flow) {
        return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
      }

      return NextResponse.json(flow);
    }

    const isSuperAdmin = (session.user as any).role === 'SUPER_ADMIN';
    const tenantId = (session.user as any).tenantId;

    if (!isSuperAdmin && !tenantId) {
      return NextResponse.json({ error: 'Unauthorized: No tenant assigned' }, { status: 401 });
    }

    const whereClause = isSuperAdmin ? {} : { tenantId: tenantId as string };

    // Get all flows
    const flows = await prisma.flow.findMany({
      where: whereClause,
      include: { intents: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(flows);
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }
}

// POST /api/flows - Create or update flow
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, config, intents, nodes, edges } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Flow name is required' }, { status: 400 });
    }

    // Get or create tenant for user
    let tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      // Create default tenant for user if none exists
      const existingTenant = await prisma.tenant.findFirst({
        where: {
          name: `${(session.user as any).email}-default`
        }
      });

      if (existingTenant) {
        tenantId = existingTenant.id;
      } else {
        const newTenant = await prisma.tenant.create({
          data: {
            name: `${(session.user as any).email}-default`,
            subscription: 'free'
          }
        });
        tenantId = newTenant.id;

        // Update user with tenant
        await prisma.user.update({
          where: { id: (session.user as any).id },
          data: { tenantId: newTenant.id }
        });
      }
    }

    if (id) {
      // Update existing flow and its intents in a transaction
      const [updatedFlow] = await prisma.$transaction([
        prisma.flow.update({
          where: { id },
          data: {
            name,
            description,
            config: config || {},
            metadata: { nodes, edges } as any
          }
        }),
        prisma.intent.deleteMany({
          where: { flowId: id }
        }),
        ...(intents && intents.length > 0 ? intents.map((intent: any) => 
          prisma.intent.create({
            data: {
              flowId: id,
              name: intent.name,
              trainingPhrases: intent.trainingPhrases || [],
              responseType: intent.answerType || 'text',
              response: intent.answer || '',
              options: intent.options,
              metadata: { customPayload: intent.customPayload } as any
            }
          })
        ) : [])
      ]);

      const flow = await prisma.flow.findUnique({
        where: { id },
        include: { intents: true }
      });

      if (!flow) {
        return NextResponse.json({ error: 'Flow not found or could not be updated' }, { status: 404 });
      }

      if (session?.user?.id) {
        await logAIAgentUpdated(session.user.id, { id }, flow);
      }

      return NextResponse.json({ status: 'updated', flow });
    } else {
      // Create new flow
      const newFlow = await prisma.flow.create({
        data: {
          name,
          description,
          tenant: {
            connect: { id: tenantId }
          },
          config: config || {},
          metadata: { nodes, edges } as any
        },
        include: { intents: true }
      });

      // Create intents separately if provided
      if (intents && intents.length > 0) {
        await Promise.all(intents.map((intent: any) =>
          prisma.intent.create({
            data: {
              flowId: newFlow.id,
              name: intent.name,
              trainingPhrases: intent.trainingPhrases || [],
              responseType: intent.answerType || 'text',
              response: intent.answer || '',
              options: intent.options,
              metadata: { customPayload: intent.customPayload } as any
            }
          })
        ));
      }

      const flowWithIntents = await prisma.flow.findUnique({
        where: { id: newFlow.id },
        include: { intents: true }
      });

      if (!flowWithIntents) {
        return NextResponse.json({ error: 'Failed to retrieve created flow' }, { status: 500 });
      }

      if (session?.user?.id) {
        await logAIAgentCreated(session.user.id, flowWithIntents);
      }

      return NextResponse.json({ status: 'created', flow: flowWithIntents }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving flow:', error);
    return NextResponse.json({ error: 'Failed to save flow' }, { status: 500 });
  }
}

// DELETE /api/flows - Delete flow
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('id');

    if (!flowId) {
      return NextResponse.json({ error: 'Flow ID is required' }, { status: 400 });
    }

    // Verify ownership
    const flow = await prisma.flow.findUnique({
      where: { id: flowId }
    });

    const isSuperAdmin = (session.user as any).role === 'SUPER_ADMIN';
    if (!flow || (!isSuperAdmin && flow.tenantId !== (session.user as any).tenantId)) {
      return NextResponse.json({ error: 'Flow not found or unauthorized' }, { status: 404 });
    }

    await prisma.flow.delete({
      where: { id: flowId }
    });

    if (session?.user?.id) {
      await logAIAgentDeleted(session.user.id, flow);
    }

    return NextResponse.json({ status: 'deleted', message: 'Flow deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
  }
}
