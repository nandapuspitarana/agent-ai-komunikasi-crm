import { NextRequest, NextResponse } from 'next/server';
import { logDocumentDeleted } from '@/lib/audit-logger';
import { prisma } from '@/lib/prisma';
import { requireUser, isSuperAdmin, ROLES_MANAGE } from '@/lib/api-guard';
import { agentProxyFetch } from '@/lib/agent-proxy-client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    const guard = await requireUser({ roles: ROLES_MANAGE });
    if (!guard.ok) return guard.response;
    const { user } = guard;

    // Non-admins may only delete documents their tenant owns.
    if (!isSuperAdmin(user)) {
      const owned = await prisma.knowledgeDocument.findFirst({
        where: {
          tenantId: user.tenantId as string,
          OR: [{ proxyDocId: documentId }, { id: documentId }],
        },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    const response = await agentProxyFetch(`/api/v1/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      throw new Error(`Failed to delete document from proxy: ${response.status}`);
    }

    const data = await response.json();

    await logDocumentDeleted(user.id, { id: documentId });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/Agent/Documents/Delete] Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
