import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const proxyUrl = process.env.AGENT_PROXY_URL || 'http://localhost:8200';
  
  try {
    const response = await fetch(`${proxyUrl}/api/v1/documents`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[API/Agent/Documents] Proxy error:', response.status, text);
      return NextResponse.json(
        { error: `AI Engine returned error ${response.status}`, documents: [], count: 0, proxyStatus: 'error' },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ ...data, proxyStatus: 'ok' });
  } catch (error: any) {
    const isConnectionError = error?.code === 'ECONNREFUSED' || error?.name === 'TimeoutError';
    console.error('[API/Agent/Documents] Error:', error?.message);
    return NextResponse.json(
      {
        error: isConnectionError
          ? 'AI Engine tidak dapat dijangkau. Pastikan server Python (uvicorn) sudah berjalan di port 8200.'
          : 'Gagal mengambil daftar dokumen.',
        documents: [],
        count: 0,
        proxyStatus: isConnectionError ? 'offline' : 'error',
      },
      { status: 200 }
    );
  }
}
