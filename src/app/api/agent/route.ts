import { NextResponse } from 'next/server';
import { agentEngine } from '@/modules/ai/agent-proxy';
import { requireUser, isSuperAdmin } from '@/lib/api-guard';

export async function POST(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const body = await request.json();
    const { prompt, sessionId, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Tenant comes from the session; only SUPER_ADMIN may target another tenant.
    const tenantId = isSuperAdmin(user) && body.tenantId ? body.tenantId : user.tenantId;

    // Process through our abstracted Agent Proxy
    const response = await agentEngine.processMessage({
      prompt,
      sessionId,
      tenantId: tenantId ?? undefined,
      context,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error: any) {
    console.error('[API Agent Route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing AI request' },
      { status: 500 }
    );
  }
}
