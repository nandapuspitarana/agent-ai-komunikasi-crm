import { NextResponse } from 'next/server';
import { agentEngine } from '@/modules/ai/agent-proxy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, sessionId, tenantId, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Process through our abstracted Agent Proxy
    const response = await agentEngine.processMessage({
      prompt,
      sessionId,
      tenantId,
      context,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error: any) {
    console.error('[API Agent Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing AI request' },
      { status: 500 }
    );
  }
}
