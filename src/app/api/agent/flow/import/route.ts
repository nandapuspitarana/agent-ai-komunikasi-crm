import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (body.type !== 'agent_flow' || !body.data) {
      return NextResponse.json(
        { error: 'Invalid file format. Ensure you uploaded a valid Agent Export JSON.' },
        { status: 400 }
      );
    }

    let { name, description, config, metadata, intents } = body.data;
    config = config || {};

    // Sync Welcome Message from the Start Intent
    if (intents && Array.isArray(intents)) {
      const startIntent = intents.find((i: any) => i.name === 'Start / Main Menu' || i.name === 'Start');
      if (startIntent) {
        config.welcomeMessage = startIntent.response;
        config.welcomeMessageType = startIntent.responseType || 'text';
        config.welcomeMessageOptions = startIntent.options || '';
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Missing agent name in import data' }, { status: 400 });
    }

    // Create the new flow inside a transaction to ensure intents are also saved
    const newFlow = await prisma.$transaction(async (tx) => {
      // 1. Create the Flow
      const flow = await tx.flow.create({
        data: {
          tenantId: session.user.tenantId,
          name: `${name} (Imported)`,
          description: description || null,
          config: config || {},
          metadata: metadata || {},
        },
      });

      // 2. Create the Intents
      if (intents && Array.isArray(intents) && intents.length > 0) {
        const intentsData = intents.map((intent: any) => ({
          flowId: flow.id,
          name: intent.name || 'Unnamed Intent',
          trainingPhrases: intent.trainingPhrases || [],
          responseType: intent.responseType || 'text',
          response: intent.response || '',
          options: intent.options || null,
          metadata: intent.metadata || {},
        }));

        await tx.intent.createMany({
          data: intentsData,
        });
      }

      return flow;
    });

    return NextResponse.json({ success: true, flow: newFlow });
  } catch (error: any) {
    console.error('[Import Flow Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
