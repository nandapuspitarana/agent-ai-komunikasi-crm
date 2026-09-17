import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logDocumentUploaded } from '@/lib/audit-logger';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const proxyUrl = process.env.AGENT_PROXY_URL || 'http://localhost:8200';
  
  try {
    const session = await auth();
    const formData = await req.formData();
    const file = formData.get('file');
    const metaName = formData.get('meta_name') as string || (file instanceof File ? file.name : 'Unknown');
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Forward the formData to the proxy
    const response = await fetch(`${proxyUrl}/api/v1/documents/ingest`, {
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
    
    if (session?.user?.id) {
      const fileName = file instanceof File ? file.name : 'Unknown';
      await logDocumentUploaded(session.user.id, { id: data.document_id || 'unknown', name: fileName });
      
      // Save document to Prisma for tenant access
      if (session.user.tenantId) {
        await prisma.knowledgeDocument.create({
          data: {
            tenantId: session.user.tenantId,
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
      }
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[API/Agent/Documents/Upload] Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
