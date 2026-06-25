import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { FlowInterpreter } from '@/modules/flow-builder/interpreter';
import { VariableManager } from '@/modules/flow-builder/variables';
import { PrismaClient, Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, tenantId, input, flowId } = await req.json();

    if (!sessionId || !tenantId || !input || !flowId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, tenantId, input, flowId' },
        { status: 400 }
      );
    }

    // Fetch flow from database
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { intents: true },
    });

    if (!flow || flow.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Flow not found or access denied' }, { status: 404 });
    }

    // Parse flow metadata (nodes and edges)
    const flowConfig = flow.metadata as Prisma.JsonObject;
    const nodes = (flowConfig?.nodes as any[]) || [];
    const edges = (flowConfig?.edges as any[]) || [];

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'Flow has no nodes configured' },
        { status: 400 }
      );
    }

    // Initialize variable system for this session
    const variableManager = new VariableManager();
    let variables = await variableManager.getVariables(sessionId, tenantId);
    if (Object.keys(variables).length === 0) {
      await variableManager.initializeSession(sessionId, tenantId, {
        input: input,
        timestamp: new Date().toISOString(),
      });
    }

    // Create flow interpreter
    const interpreter = new FlowInterpreter(nodes, edges, {
      variables,
      currentStep: null,
      history: [],
    });

    // Execute flow
    const result = await interpreter.execute(input);

    // Save updated variables back to variable manager
    await variableManager.updateVariables(sessionId, tenantId, result.context.variables);

    // Store conversation in database using Message model
    // Note: Using existing Message model from ChatSession
    const chatSession = await prisma.chatSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        tenantId,
        contactId: 'widget_visitor',
        channel: 'widget',
        status: 'bot',
      },
      update: {},
    });

    await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        senderType: 'user',
        content: input,
      },
    });

    await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        senderType: 'flow',
        content: result.response,
      },
    });

    return NextResponse.json({
      response: result.response,
      nextStep: result.nextStep,
      variables: result.context.variables,
      history: result.context.history,
    });
  } catch (error) {
    console.error('Flow execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Flow execution failed' },
      { status: 500 }
    );
  }
}
