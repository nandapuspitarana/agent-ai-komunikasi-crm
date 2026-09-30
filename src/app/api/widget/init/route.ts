import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getVisitorConfig } from '@/lib/visitor-config';
import { resolveEffectiveFlow, readWelcomeConfig } from '@/lib/flow-resolver';

export async function POST(request: Request) {
  try {
    const { websiteUrl, tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        activeFlow: true,
        flows: {
          take: 1,
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const flow = resolveEffectiveFlow(tenant);
    const flowConfig = (flow?.config || {}) as any;
    const dynamicBotName = flowConfig?.name || flow?.name || 'Claire';
    const welcome = readWelcomeConfig(flowConfig);
    const vConfig = getVisitorConfig(tenant.visitorConfig);

    return NextResponse.json({
      status: 'success',
      config: {
        name: tenant.name,
        tenantName: tenant.name,
        botName: dynamicBotName,
        primaryColor: tenant.themeBrandColor || '#2563eb', // Use tenant color
        logo: tenant.themeBrandLogo || null,
        botAvatarUrl: flowConfig?.botAvatarUrl || tenant.botAvatarUrl || null,
        // Public endpoint: expose identity only. The full flow row carries
        // config.systemPrompt / humanPrompt / businessNeeds, which must not leak.
        initialFlow: flow ? { id: flow.id, name: flow.name } : null,
        welcomeMessage: welcome.message,
        welcomeMessageType: welcome.type,
        // Comma string kept for SDK builds that parse it themselves.
        welcomeMessageOptions: welcome.rawOptions,
        // Structured form: [{ label, value }]
        welcomeOptions: welcome.options,
        visitorCollection: {
          enabled: vConfig.enabled,
          layer1_passive: vConfig.layer1_passive,
          layer1_geolocation: vConfig.layer1_geolocation,
          layer3_leadform: vConfig.layer3_leadform,
          layer4_classification: vConfig.layer4_classification
        }
      }
    });

  } catch (error) {
    console.error('Widget init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
