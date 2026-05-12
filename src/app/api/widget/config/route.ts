import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID is required' },
      { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  // TODO: Integrasi dengan Prisma untuk mengambil data asli
  // const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } })
  
  // Data Mock untuk kebutuhan uji coba
  const mockSettings = {
    tenantId,
    primaryColor: '#2563eb', // Warna biru khas Tailwind
    welcomeMessage: 'Hi there! How can we help you today?',
    logoUrl: 'https://via.placeholder.com/40',
    botName: 'CRM Support Bot'
  };

  return NextResponse.json(mockSettings, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Mengizinkan cross-domain
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}

// Handler untuk Preflight Request (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
