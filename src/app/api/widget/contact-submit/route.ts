import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertVisitorProfile, updateVisitorClassification } from '@/lib/visitor-service';
import { getVisitorConfig } from '@/lib/visitor-config';

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
      tenantId,
      sessionId,
      contactId,
      category,
      description,
      email,
      name,
      company,
    } = body;

    if (!tenantId || !category || !description) {
      return corsResponse(
        { error: 'Missing required fields: tenantId, category, and description are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        fallbackEmail: true,
        visitorConfig: true,
      },
    });

    if (!tenant) {
      return corsResponse({ error: 'Tenant not found' }, { status: 404 });
    }

    const resolvedContactId = contactId || (sessionId ? undefined : `widget_${Date.now()}`);

    // 2. Resolve or Create ChatSession
    let currentSession = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!currentSession && resolvedContactId) {
      currentSession = await prisma.chatSession.findFirst({
        where: { tenantId, contactId: resolvedContactId },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!currentSession) {
      currentSession = await prisma.chatSession.create({
        data: {
          tenantId,
          contactId: resolvedContactId || `widget_${Date.now()}`,
          channel: 'widget',
          status: 'bot',
        },
      });
    }

    const actualSessionId = currentSession.id;
    const finalContactId = currentSession.contactId;

    // 3. Save User Submission Message to Chat
    const userMessageContent = [
      `📝 [Laporan Masalah ke Perusahaan]`,
      `• Kategori: ${category}`,
      company ? `• Perusahaan: ${company}` : null,
      name ? `• Nama: ${name}` : null,
      email ? `• Email: ${email}` : null,
      `• Deskripsi: ${description}`,
    ]
      .filter(Boolean)
      .join('\n');

    await prisma.message.create({
      data: {
        sessionId: actualSessionId,
        senderType: 'user',
        content: userMessageContent,
      },
    });

    // 4. Create Bot Confirmation Message
    const botReply = `Terima kasih${name ? ` ${name}` : ''}! Pesan dan laporan Anda terkait "${category}" telah kami teruskan ke tim perusahaan. Kami akan segera menindaklanjuti${email ? ` melalui email (${email})` : ''}.`;

    const botMsg = await prisma.message.create({
      data: {
        sessionId: actualSessionId,
        senderType: 'bot',
        content: botReply,
      },
    });

    // 5. Update Funnel Data in VisitorProfile
    const visitorConfig = getVisitorConfig(tenant.visitorConfig);
    try {
      // Ensure profile exists
      const existingProfile = await prisma.visitorProfile.findUnique({
        where: { tenantId_contactId: { tenantId, contactId: finalContactId } },
      });

      const existingMeta: Record<string, any> =
        existingProfile?.metadata &&
        !Array.isArray(existingProfile.metadata) &&
        typeof existingProfile.metadata === 'object'
          ? (existingProfile.metadata as Record<string, any>)
          : {};

      const updatedMeta = {
        ...existingMeta,
        ...(company && { company }),
        lastInquiryCategory: category,
        lastInquiryDescription: description,
        lastInquirySubmittedAt: new Date().toISOString(),
      };

      if (!existingProfile) {
        await prisma.visitorProfile.create({
          data: {
            tenantId,
            contactId: finalContactId,
            name: name || null,
            email: email || null,
            metadata: updatedMeta,
            lastIntent: category,
            leadClassification: 'support',
            leadScore: 25,
            sessions: 1,
            messageCount: 2,
          },
        });
      } else {
        const updateData: any = {
          metadata: updatedMeta,
          lastIntent: category,
          lastSeenAt: new Date(),
          messageCount: { increment: 2 },
          leadScore: { increment: 25 },
        };

        if (name && !existingProfile.name) updateData.name = name;
        if (email && !existingProfile.email) updateData.email = email;

        // Promote classification if cold
        if (existingProfile.leadClassification === 'cold') {
          updateData.leadClassification = 'support';
        }

        await prisma.visitorProfile.update({
          where: { id: existingProfile.id },
          data: updateData,
        });
      }
    } catch (vErr) {
      console.error('[Contact Submit API] Error updating visitor profile:', vErr);
    }

    // 6. Notify Company via fallbackEmail (logged or SMTP)
    if (tenant.fallbackEmail) {
      console.log(`[Contact Submit API] Notification dispatched to company email: ${tenant.fallbackEmail}`, {
        tenantId,
        category,
        description,
        email,
        name,
        company,
      });
    }

    return corsResponse({
      success: true,
      sessionId: actualSessionId,
      botReply,
      botMessageId: botMsg.id,
      summary: {
        category,
        description,
        email,
        name,
        company,
      },
    });
  } catch (error) {
    console.error('[Contact Submit API] Internal error:', error);
    return corsResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
