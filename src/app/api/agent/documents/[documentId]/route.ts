import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logDocumentDeleted } from '@/lib/audit-logger';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const proxyUrl = process.env.AGENT_PROXY_URL || 'http://localhost:8000';
  const { documentId } = params;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }
  
  try {
    const session = await auth();
    const response = await fetch(`${proxyUrl}/api/v1/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      throw new Error(`Failed to delete document from proxy: ${response.status}`);
    }

    const data = await response.json();
    
    if (session?.user?.id) {
      await logDocumentDeleted(session.user.id, { id: documentId });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/Agent/Documents/Delete] Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
