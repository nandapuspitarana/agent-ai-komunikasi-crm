import { NextRequest, NextResponse } from 'next/server';
import { logDocumentUploaded } from '@/lib/audit-logger';
import { prisma } from '@/lib/prisma';
import { requireUser, isSuperAdmin, ROLES_MANAGE } from '@/lib/api-guard';
import { agentProxyFetch } from '@/lib/agent-proxy-client';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireUser({ roles: ROLES_MANAGE });
    if (!guard.ok) return guard.response;
    const { user } = guard;

    const formData = await req.formData();
    const file = formData.get('file');
    const metaName = formData.get('meta_name') as string || (file instanceof File ? file.name : 'Unknown');
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Tenant isolation key comes from the session, never from the client
    // (SUPER_ADMIN may still upload on behalf of a tenant).
    if (!isSuperAdmin(user) || !formData.get('tenant_id')) {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
      }
      formData.set('tenant_id', user.tenantId);
    }

    // A flow_id, if given, must belong to that tenant.
    const flowId = formData.get('flow_id');
    if (typeof flowId === 'string' && flowId) {
      const flow = await prisma.flow.findFirst({
        where: { id: flowId, tenantId: formData.get('tenant_id') as string },
        select: { id: true },
      });
      if (!flow) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Forward the formData to the proxy
    const response = await agentProxyFetch('/api/v1/documents/ingest', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/Agent/Documents/Upload] Proxy error:', response.status, errorText);
      return NextResponse.json(
        { error: `Proxy returned error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const fileName = file instanceof File ? file.name : 'Unknown';
    await logDocumentUploaded(user.id, { id: data.document_id || 'unknown', name: fileName });

    // Save document to Prisma for tenant access
    await prisma.knowledgeDocument.create({
      data: {
        tenantId: formData.get('tenant_id') as string,
        metaName: metaName,
        description: description || null,
        category: category || null,
        filename: fileName,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
        status: 'ready',
        chunkCount: data.chunk_count || 0,
        proxyDocId: data.document_id,
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[API/Agent/Documents/Upload] Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
