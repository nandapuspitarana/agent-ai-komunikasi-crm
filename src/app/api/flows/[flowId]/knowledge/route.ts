import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireUser, canAccessTenant, ROLES_MANAGE } from '@/lib/api-guard';
import { agentProxyFetch } from '@/lib/agent-proxy-client';

// GET /api/flows/[flowId]/knowledge - list docs for this agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const flow = await prisma.flow.findUnique({ where: { id: flowId }, select: { tenantId: true } });
    if (!flow || !canAccessTenant(guard.user, flow.tenantId)) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const docs = await prisma.knowledgeDocument.findMany({
      where: { flowId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents: docs, count: docs.length });
  } catch (error) {
    console.error('[Knowledge GET]', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST /api/flows/[flowId]/knowledge - upload + ingest document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const guard = await requireUser({ roles: ROLES_MANAGE });
    if (!guard.ok) return guard.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metaName = formData.get('meta_name') as string;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const tagsRaw = formData.get('tags') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!metaName) return NextResponse.json({ error: 'meta_name is required' }, { status: 400 });

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';

    const flow = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow || !canAccessTenant(guard.user, flow.tenantId)) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 1. Create record in DB as pending
    const doc = await prisma.knowledgeDocument.create({
      data: {
        flowId,
        tenantId: flow.tenantId,
        metaName,
        description: description || null,
        category: category || null,
        tags,
        filename: file.name,
        fileType,
        status: 'pending',
      },
    });

    // 2. Forward to Python AI proxy for vector ingestion
    try {
      const proxyFormData = new FormData();
      const fileBuffer = await file.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: file.type });
      proxyFormData.append('file', fileBlob, file.name);

      // RAG isolation keys (required by proxy — hard error if missing)
      proxyFormData.append('flow_id', flowId);              // AI Bot identifier
      proxyFormData.append('tenant_id', flow.tenantId);    // Tenant identifier
      proxyFormData.append('bot_name', flow.name || '');   // Human-readable bot label

      // Document metadata
      proxyFormData.append('meta_name', metaName);
      if (tagsRaw) proxyFormData.append('tags', tagsRaw);
      if (description) proxyFormData.append('description', description);
      if (category) proxyFormData.append('category', category);

      const proxyRes = await agentProxyFetch('/api/v1/documents/ingest', {
        method: 'POST',
        body: proxyFormData,
        signal: AbortSignal.timeout(60000),
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'ready',
            chunkCount: proxyData.chunk_count || 0,
            proxyDocId: proxyData.document_id || null,
          },
        });
        return NextResponse.json({ ...doc, status: 'ready', chunkCount: proxyData.chunk_count });
      } else {
        const errText = await proxyRes.text();
        console.error('[Knowledge POST] Proxy returned non-OK status:', proxyRes.status, 'Body:', errText);
        await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: { status: 'failed', errorMsg: `Proxy error: ${proxyRes.status}` },
        });
        return NextResponse.json({ ...doc, status: 'failed', warning: `Proxy error: ${errText}` });
      }
    } catch (proxyErr: any) {
      console.error('[Knowledge POST Proxy Error]', proxyErr);
      // Proxy offline - keep DB record as pending
      await prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', errorMsg: `AI Engine Error: ${proxyErr.message || 'offline'}` },
      });
      return NextResponse.json({
        ...doc,
        status: 'failed',
        warning: `Document saved but AI Engine failed: ${proxyErr.message}`,
      });
    }
  } catch (error) {
    console.error('[Knowledge POST]', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
