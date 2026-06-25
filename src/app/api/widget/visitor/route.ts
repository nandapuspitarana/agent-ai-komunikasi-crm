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
    const { 
      tenantId, contactId,
      referrerUrl, pageUrl, deviceType, browserName, os,
      utmSource, utmMedium, utmCampaign,
      name, email, phone 
    } = body;

    if (!tenantId || !contactId) {
      return corsResponse(
        { error: 'Missing required fields: tenantId, contactId' },
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
      return corsResponse({ status: 'ignored', reason: 'Visitor tracking is disabled for this tenant' }, { status: 200 });
    }

    // Build update data based on what's allowed
    const updateData: any = {
      lastSeenAt: new Date()
    };

    // Layer 1 pasive data
    if (config.layer1_passive) {
      if (referrerUrl !== undefined) updateData.referrerUrl = referrerUrl;
      if (pageUrl !== undefined) updateData.pageUrl = pageUrl;
      if (deviceType !== undefined) updateData.deviceType = deviceType;
      if (browserName !== undefined) updateData.browserName = browserName;
      if (os !== undefined) updateData.os = os;
      if (utmSource !== undefined) updateData.utmSource = utmSource;
      if (utmMedium !== undefined) updateData.utmMedium = utmMedium;
      if (utmCampaign !== undefined) updateData.utmCampaign = utmCampaign;
    }

    // Lead form data (usually layer 3, but we allow direct updates if provided)
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    // Check if visitor exists
    const existingProfile = await prisma.visitorProfile.findUnique({
      where: {
        tenantId_contactId: {
          tenantId,
          contactId
        }
      }
    });

    if (existingProfile) {
      // Update existing
      await prisma.visitorProfile.update({
        where: { id: existingProfile.id },
        data: {
          ...updateData,
          sessions: { increment: 1 } // Increment session on init
        }
      });
    } else {
      // Create new
      await prisma.visitorProfile.create({
        data: {
          tenantId,
          contactId,
          ...updateData,
          sessions: 1,
          messageCount: 0
        }
      });
    }

    return corsResponse({ status: 'success' });
  } catch (error) {
    console.error('[Visitor API Error]', error);
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
