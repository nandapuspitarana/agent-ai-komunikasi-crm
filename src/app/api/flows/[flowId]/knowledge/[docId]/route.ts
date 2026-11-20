import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireUser, canAccessTenant, ROLES_MANAGE } from '@/lib/api-guard';
import { agentProxyFetch } from '@/lib/agent-proxy-client';

// DELETE /api/flows/[flowId]/knowledge/[docId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string; docId: string }> }
) {
  const { flowId, docId } = await params;
  try {
    const guard = await requireUser({ roles: ROLES_MANAGE });
    if (!guard.ok) return guard.response;

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: docId, flowId },
    });
    if (!doc || !canAccessTenant(guard.user, doc.tenantId)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Try to also delete from Python proxy — but only when no other agent still links
    // the same proxy document (documents/link duplicates the record per flow).
    const otherLinks = doc.proxyDocId
      ? await prisma.knowledgeDocument.count({ where: { proxyDocId: doc.proxyDocId, id: { not: docId } } })
      : 0;
    if (doc.proxyDocId && otherLinks === 0) {
      try {
        await agentProxyFetch(`/api/v1/documents/${encodeURIComponent(doc.proxyDocId)}`, {
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
