import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logDocumentUploaded } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  const proxyUrl = process.env.AGENT_PROXY_URL || 'http://localhost:8000';
  
  try {
    const session = await auth();
    const formData = await req.formData();
    const file = formData.get('file');

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
