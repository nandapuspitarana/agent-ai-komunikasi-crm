import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceDocumentId, flowId } = body;

    if (!sourceDocumentId || !flowId) {
      return NextResponse.json({ error: 'Missing sourceDocumentId or flowId' }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 });
    }

    // Verify the source document belongs to the tenant or fallback to public.crm_documents
    let sourceDoc = await prisma.knowledgeDocument.findFirst({
      where: {
        id: sourceDocumentId,
        tenantId: tenantId,
      }
    });

    if (!sourceDoc) {
      sourceDoc = await prisma.knowledgeDocument.findFirst({
        where: {
          proxyDocId: sourceDocumentId,
          tenantId: tenantId,
        }
      });
    }

    if (!sourceDoc) {
      try {
        const crmDocs = await prisma.$queryRawUnsafe<any[]>(`
          SELECT id, filename, file_type, metadata, status, chunk_count
          FROM public.crm_documents
          WHERE id = $1::uuid AND status = 'ready'
        `, sourceDocumentId);

        if (crmDocs.length > 0) {
          const cd = crmDocs[0];
          const meta = typeof cd.metadata === 'string' ? JSON.parse(cd.metadata) : (cd.metadata || {});
          sourceDoc = {
            id: cd.id,
            tenantId: tenantId,
            metaName: meta.name || cd.filename,
            description: meta.description || null,
            category: meta.category || 'Knowledge Base',
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            filename: cd.filename,
            fileType: cd.file_type || 'md',
            status: cd.status || 'ready',
            chunkCount: cd.chunk_count || 0,
            proxyDocId: cd.id,
          } as any;
        }
      } catch (err: any) {
        console.error('[API/Agent/Documents/Link] Lookup fallback error:', err?.message);
      }
    }

    if (!sourceDoc) {
      return NextResponse.json({ error: 'Source document not found' }, { status: 404 });
    }

    // Check if it's already linked to this flow
    const existingLink = await prisma.knowledgeDocument.findFirst({
      where: {
        flowId: flowId,
        proxyDocId: sourceDoc.proxyDocId,
      }
    });

    if (existingLink) {
      return NextResponse.json({ error: 'Dokumen ini sudah ada di agen ini' }, { status: 400 });
    }

    // Duplicate the document record for the new flow
    const newDoc = await prisma.knowledgeDocument.create({
      data: {
        flowId: flowId,
        tenantId: tenantId,
        metaName: sourceDoc.metaName,
        description: sourceDoc.description,
        category: sourceDoc.category,
        tags: sourceDoc.tags,
        filename: sourceDoc.filename,
        fileType: sourceDoc.fileType,
        status: sourceDoc.status,
        chunkCount: sourceDoc.chunkCount,
        proxyDocId: sourceDoc.proxyDocId,
      }
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error: any) {
    console.error('[API/Agent/Documents/Link] Error:', error?.message);
    return NextResponse.json(
      { error: 'Gagal menautkan dokumen ke agen.' },
      { status: 500 }
    );
  }
}
