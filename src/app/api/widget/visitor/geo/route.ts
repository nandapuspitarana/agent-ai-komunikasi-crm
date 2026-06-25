import { NextRequest, NextResponse } from 'next/server';
import { getVisitorConfig } from '@/lib/visitor-config';

import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...init?.headers,
      ...corsHeaders,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, contactId, latitude, longitude } = body;

    if (!tenantId || !contactId || latitude === undefined || longitude === undefined) {
      return corsResponse(
        { error: 'Missing required fields: tenantId, contactId, latitude, longitude' },
        { status: 400 }
      );
    }

    // Fetch tenant to check visitor config
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { visitorConfig: true }
    });

    if (!tenant) {
      return corsResponse({ error: 'Tenant not found' }, { status: 404 });
    }

    const config = getVisitorConfig(tenant.visitorConfig);
    
    // Master switch guard
    if (!config.enabled) {
      return corsResponse({ status: 'ignored', reason: 'Visitor tracking is disabled' }, { status: 200 });
    }

    // Geo guard
    if (!config.layer1_geolocation) {
      return corsResponse({ status: 'ignored', reason: 'Geolocation collection is disabled' }, { status: 200 });
    }

    // Update visitor profile with geolocation
    await prisma.visitorProfile.updateMany({
      where: {
        tenantId,
        contactId
      },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        lastSeenAt: new Date()
      }
    });

    return corsResponse({ status: 'success' });
  } catch (error) {
    console.error('[Visitor Geo API Error]', error);
    return corsResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
