import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { VariableManager } from '@/modules/flow-builder/variables';
import { logChatMessageSent } from '@/lib/audit-logger';

import { prisma } from '@/lib/prisma';

/**
 * Endpoint to send agent response back to widget via Socket.io
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, tenantId, message, metadata } = await req.json();

    if (!sessionId || !tenantId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, tenantId, message' },
        { status: 400 }
      );
    }

    // Save agent message to database using Message model
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    await prisma.message.create({
      data: {
        sessionId,
        senderType: 'agent',
        content: message,
      },
    });

    // Update variables if provided
    if (metadata?.variables) {
      const variableManager = new VariableManager();
      await variableManager.updateVariables(sessionId, tenantId, metadata.variables);
    }

    // Emit message via Socket.io to widget
    // Note: This will be handled by the Socket.io server
    // The widget is listening on the 'message' event for responses

    await logChatMessageSent(session.user.id, sessionId, message);

    return NextResponse.json({
      success: true,
      message: 'Response sent to widget',
    });
  } catch (error) {
    console.error('Error sending agent response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send response' },
      { status: 500 }
    );
  }
}
