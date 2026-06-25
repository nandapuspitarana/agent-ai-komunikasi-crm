import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

// DELETE /api/flows/[flowId]/knowledge/[docId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string; docId: string }> }
) {
  const { flowId, docId } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: docId, flowId },
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Try to also delete from Python proxy
    if (doc.proxyDocId) {
      const proxyUrl = process.env.AGENT_PROXY_URL || 'http://localhost:8200';
      try {
        await fetch(`${proxyUrl}/api/v1/documents/${doc.proxyDocId}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore proxy errors - still delete from DB
      }
    }

    await prisma.knowledgeDocument.delete({ where: { id: docId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Knowledge DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
