import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 });
    }

    // Fetch all ready documents for this tenant
    // Use distinct on proxyDocId so we don't list duplicates if a document is used in multiple flows
    let documents = await prisma.knowledgeDocument.findMany({
      where: {
        tenantId: tenantId,
        status: 'ready',
        proxyDocId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['proxyDocId']
    });

    // Fallback: If no documents found in KnowledgeDocument, load from public.crm_documents
    if (documents.length === 0) {
      try {
        const crmDocs = await prisma.$queryRawUnsafe<any[]>(`
          SELECT id, filename, file_type, metadata, status, chunk_count, created_at
          FROM public.crm_documents
          WHERE status = 'ready'
          ORDER BY created_at DESC
        `);
        documents = crmDocs.map(cd => {
          const meta = typeof cd.metadata === 'string' ? JSON.parse(cd.metadata) : (cd.metadata || {});
          return {
            id: cd.id,
            tenantId: tenantId,
            metaName: meta.name || cd.filename,
            description: meta.description || null,
            category: meta.category || 'Knowledge Base',
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            filename: cd.filename,
            fileType: cd.file_type || 'md',
            status: cd.status,
            chunkCount: cd.chunk_count || 0,
            proxyDocId: cd.id,
            createdAt: cd.created_at,
            updatedAt: cd.created_at,
          } as any;
        });
      } catch (err: any) {
        console.error('[API/Agent/Documents/Tenant] Fallback error:', err?.message);
      }
    }

    return NextResponse.json({ documents, count: documents.length });
  } catch (error: any) {
    console.error('[API/Agent/Documents/Tenant] Error:', error?.message);
    return NextResponse.json(
      { error: 'Gagal mengambil library dokumen tenant.', documents: [], count: 0 },
      { status: 500 }
    );
  }
}
