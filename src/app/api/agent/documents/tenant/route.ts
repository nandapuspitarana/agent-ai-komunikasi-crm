import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Fetch all ready documents for this tenant
    // Use distinct on proxyDocId so we don't list duplicates if a document is used in multiple flows
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        tenantId: tenantId,
        status: 'ready',
        proxyDocId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['proxyDocId']
    });

    return NextResponse.json({ documents, count: documents.length });
  } catch (error: any) {
    console.error('[API/Agent/Documents/Tenant] Error:', error?.message);
    return NextResponse.json(
      { error: 'Gagal mengambil library dokumen tenant.', documents: [], count: 0 },
      { status: 500 }
    );
  }
}
