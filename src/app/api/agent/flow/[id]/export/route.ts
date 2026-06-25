import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logDataExported } from '@/lib/audit-logger';

import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the flow and its intents
    const flow = await prisma.flow.findUnique({
      where: {
        id,
        tenantId: session.user.tenantId, // Ensure it belongs to their tenant
      },
      include: {
        intents: true,
      },
    });

    if (!flow) {
      return NextResponse.json({ error: 'Agent Flow not found' }, { status: 404 });
    }

    // Format for export (remove IDs and tenant info so it can be safely imported anywhere)
    const exportData = {
      version: '1.0',
      type: 'agent_flow',
      data: {
        name: flow.name,
        description: flow.description,
        config: flow.config,
        metadata: flow.metadata,
        // Format Intents and inject Welcome Message sync
        intents: (() => {
          let exportIntents = flow.intents.map((intent) => {
            if (intent.name === 'Start / Main Menu' || intent.name === 'Start') {
              // Sync from UI config if available
              return {
                name: intent.name,
                trainingPhrases: intent.trainingPhrases,
                responseType: (flow.config as any)?.welcomeMessageType || intent.responseType,
                response: (flow.config as any)?.welcomeMessage || intent.response,
                options: (flow.config as any)?.welcomeMessageOptions || intent.options,
                metadata: intent.metadata,
              };
            }
            return {
              name: intent.name,
              trainingPhrases: intent.trainingPhrases,
              responseType: intent.responseType,
              response: intent.response,
              options: intent.options,
              metadata: intent.metadata,
            };
          });

          // If no Start intent exists, create one from config
          if (!exportIntents.find(i => i.name === 'Start / Main Menu' || i.name === 'Start')) {
            exportIntents.unshift({
              name: 'Start / Main Menu',
              trainingPhrases: ['hi', 'hello', 'start', 'menu', 'start again', 'help'],
              responseType: (flow.config as any)?.welcomeMessageType || 'text',
              response: (flow.config as any)?.welcomeMessage || 'Hello!',
              options: (flow.config as any)?.welcomeMessageOptions || '',
              metadata: {},
            });
          }

          return exportIntents;
        })(),
      },
    };

    // Log the export action
    await logDataExported(session.user.id, 'Flow', flow.id);

    // Return as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="agent-export-${flow.name.replace(/\s+/g, '-').toLowerCase()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[Export Flow Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
