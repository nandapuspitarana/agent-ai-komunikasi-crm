import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/flows/[flowId]/knowledge - list docs for this agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    if (!flow) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

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
    let proxyUrl = process.env.AGENT_PROXY_URL || 'http://127.0.0.1:8000';
    proxyUrl = proxyUrl.replace('localhost', '127.0.0.1');
    try {
      const proxyFormData = new FormData();
      proxyFormData.append('file', file);
      proxyFormData.append('meta_name', metaName);
      proxyFormData.append('agent_id', flowId);
      if (tagsRaw) proxyFormData.append('tags', tagsRaw);
      if (description) proxyFormData.append('description', description);
      if (category) proxyFormData.append('category', category);

      const proxyRes = await fetch(`${proxyUrl}/api/v1/documents/ingest`, {
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
