import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertVisitorProfile, updateVisitorClassification } from '@/lib/visitor-service';
import { getVisitorConfig } from '@/lib/visitor-config';
import { sendInquiryNotificationToTenant } from '@/lib/email-service';

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
      language,
    } = body;

    const rawEmailCenter =
      body.email_center ?? body.emailCenter ?? body.centre_email ?? body.centreEmail;
    const emailCenter = typeof rawEmailCenter === 'string' ? rawEmailCenter.trim() : '';

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
        // Same fallback chain as /api/widget/init and /api/widget/message
        activeFlow: { select: { config: true } },
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

    // Resolve language: tenant.visitorConfig.language > active flow language > body.language > 'en'.
    // The server-side setting wins so that a stale client (cached init config) cannot flip the
    // language of what is stored in the chat; this matches /api/widget/init and /api/widget/message.
    const tenantVConfig = (tenant.visitorConfig || {}) as any;
    const flowLanguage = ((tenant as any).activeFlow?.config as any)?.language;
    const requestedLang = String(tenantVConfig?.language || flowLanguage || language || '').trim().toLowerCase();
    const isId = requestedLang.startsWith('id');
    const effectiveLang = isId ? 'id' : 'en';
    const visitorConfig = getVisitorConfig(tenant.visitorConfig, effectiveLang);

    // 3. Save User Submission Message to Chat
    const userMessageContent = isId
      ? [
          `📝 [Laporan Masalah ke Perusahaan]`,
          `• Kategori: ${category}`,
          company ? `• Perusahaan: ${company}` : null,
          name ? `• Nama: ${name}` : null,
          email ? `• Email: ${email}` : null,
          `• Deskripsi: ${description}`,
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `📝 [Inquiry / Issue Report to Company]`,
          `• Category: ${category}`,
          company ? `• Company: ${company}` : null,
          name ? `• Name: ${name}` : null,
          email ? `• Email: ${email}` : null,
          `• Description: ${description}`,
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
    const customTemplate = visitorConfig.contactForm?.autoReplyTemplate?.trim();
    const defaultBotReply = isId
      ? `Terima kasih${name ? ` ${name}` : ''}! Pesan dan laporan Anda terkait "${category}" telah kami teruskan ke tim perusahaan. Kami akan segera menindaklanjuti${email ? ` melalui email (${email})` : ''}.`
      : `Thank you${name ? ` ${name}` : ''}! Your message and report regarding "${category}" has been forwarded to our team. We will follow up with you shortly${email ? ` via email (${email})` : ''}.`;

    const botReply = customTemplate
      ? customTemplate
          .replace(/\{name\}/g, name || '')
          .replace(/\{category\}/g, category)
          .replace(/\{company\}/g, company || '')
          .replace(/\{email\}/g, email || '')
      : defaultBotReply;

    const botMsg = await prisma.message.create({
      data: {
        sessionId: actualSessionId,
        senderType: 'bot',
        content: botReply,
      },
    });

    // 5. Update Funnel Data in VisitorProfile
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
        ...(emailCenter && { emailCenter, lastInquiryEmailCenter: emailCenter }),
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

    // 6. Notify Company via emailCenter (workspace center email) or fallbackEmail (using configured Email Service: Azure, Gmail, or Custom SMTP)
    const targetNotificationEmail = emailCenter || tenant.fallbackEmail?.trim();
    if (targetNotificationEmail) {
      console.log(
        `[Contact Submit API] Dispatching notification to: ${emailCenter ? `workspace center email (${emailCenter})` : `tenant fallback email (${tenant.fallbackEmail})`}`
      );
      sendInquiryNotificationToTenant(
        tenant,
        {
          category,
          description,
          email,
          name,
          company,
          sessionId: actualSessionId,
          emailCenter: emailCenter || undefined,
        },
        emailCenter || undefined
      ).catch((emailErr) => {
        console.error('[Contact Submit API] Error dispatching email notification:', emailErr);
      });
    }

    return corsResponse({
      success: true,
      sessionId: actualSessionId,
      userMessage: userMessageContent,
      botReply,
      botMessageId: botMsg.id,
      summary: {
        category,
        description,
        email,
        name,
        company,
        email_center: emailCenter || null,
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
