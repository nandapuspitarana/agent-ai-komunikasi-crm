import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}

// POST /api/widget/config - Initialize widget session
export async function POST(request: NextRequest) {
  try {
    const { source } = await request.json();

    if (!source) {
      return NextResponse.json({ error: 'source is required' }, { status: 400 });
    }

    // Generate unique session ID for this widget instance
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Get tenant from host (in production, map domain to tenant)
    // For now, default to first tenant
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        sessionId,
        tenantId: tenant.id,
        source,
        timestamp: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Widget config error:', error);
    return NextResponse.json({ error: 'Failed to initialize widget' }, { status: 500 });
  }
}

// Handler untuk Preflight Request (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
