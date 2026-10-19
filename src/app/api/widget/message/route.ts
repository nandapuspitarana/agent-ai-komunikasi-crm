import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/ai-agent';
import {
  checkHandoffIntent,
  buildSystemPrompt,
  parseAIResponseForHandoff,
  parseClassificationTag,
  parseDataExtractionTag
} from '@/lib/ai-rules';
import { getVisitorConfig } from '@/lib/visitor-config';
import { parseOptions, toLegacyHtml } from '@/lib/quick-replies';
import { extractVisitorData } from '@/lib/visitor-extractor';
import { updateVisitorFromExtraction, upsertVisitorProfile, updateVisitorClassification, shouldTriggerLeadForm } from '@/lib/visitor-service';
import {
  findCentre,
  findCentresByEmail,
  detectCentreInText,
  detectCityInText,
  resolveDynamicHandoff,
} from '@/lib/centres-directory';

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


/**
 * GET /api/widget/message?sessionId=xxx&after=xxx
 * 
 * Public endpoint for chat clients (Mobile App SDK, Widget) to poll and sync messages.
 * Allows asynchronous delivery of human agent replies and session updates.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const contactId = searchParams.get('contactId');
    const tenantId = searchParams.get('tenantId');
    const after = searchParams.get('after');

    if (!sessionId && !(contactId && tenantId)) {
      return corsResponse(
        { error: 'Missing required query parameter: sessionId or (contactId and tenantId)' },
        { status: 400 }
      );
    }

    let session = sessionId && !sessionId.startsWith('session_')
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session && contactId && tenantId) {
      session = await prisma.chatSession.findFirst({
        where: {
          tenantId,
          contactId,
          status: { in: ['agent', 'queue', 'bot'] }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!session) {
      return corsResponse(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    let agentName: string | null = null;
    if (session.assignedAgentId) {
      const agentUser = await prisma.user.findUnique({
        where: { id: session.assignedAgentId },
        select: { name: true }
      });
      agentName = agentUser?.name || 'Agent';
    }

    const whereClause: any = { sessionId: session.id };
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        whereClause.createdAt = { gt: afterDate };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return corsResponse({
      success: true,
      sessionId: session.id,
      status: session.status,
      handoffRequested: session.handoffRequested,
      assignedAgentId: session.assignedAgentId,
      assignedAgentName: agentName,
      messages: messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        senderName: m.senderType === 'agent' ? agentName : (m.senderType === 'bot' ? 'Claire' : undefined),
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Widget Message Sync API] Error:', error);
    return corsResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/widget/message
 * 
 * Endpoint utama yang menerima pesan dari widget chat.
 * Tidak memerlukan autentikasi — hanya membutuhkan tenantId yang valid.
 * 
 * Flow:
 * 1. Terima pesan dari widget
 * 2. Simpan pesan user ke DB
 * 3. Cek status sesi (bot / agent / queue)
 * 4. Jika mode 'bot':
 *    a. Cek keyword handoff terlebih dahulu (cepat, tanpa LLM)
 *    b. Jika tidak ada handoff keyword → kirim ke AI engine untuk balasan
 *    c. Parse balasan AI untuk flag [HANDOFF_REQUESTED]
 *    d. Jika handoff → ubah status sesi, emit event ke dashboard agent
 *    e. Simpan balasan AI → kirim kembali ke widget via response
 * 5. Jika mode 'agent' → informasikan bahwa agen sudah menangani
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return corsResponse(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    const { sessionId, tenantId, message, contactId, channel = 'widget' } = body || {};
    const rawEmailCenter =
      body.email_center ?? body.emailCenter ?? body.centre_email ?? body.centreEmail;
    const emailCenter = typeof rawEmailCenter === 'string' ? rawEmailCenter.trim() : '';

    const rawCentre =
      body.centre ?? body.centre_name ?? body.centreName ?? body.center ?? body.centerName;
    const requestCentre = typeof rawCentre === 'string' ? rawCentre.trim() : '';

    const rawCity = body.city ?? body.userCity ?? body.cityName;
    const requestCity = typeof rawCity === 'string' ? rawCity.trim() : '';

    const rawWorkspace =
      body.workspace ?? body.workspaceName ?? body.workspace_name ?? body.venue;
    const requestWorkspace = typeof rawWorkspace === 'string' ? rawWorkspace.trim() : '';

    const visitorName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const visitorEmail = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
    const visitorPhone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    const visitorCompany = typeof body.company === 'string' && body.company.trim() ? body.company.trim() : null;

    if (!tenantId || !message) {
      return corsResponse(
        { error: 'Missing required fields: tenantId, message' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        handoffAgent: {
          select: { name: true }
        },
        activeFlow: {
          include: {
            intents: true
          }
        },
        flows: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          include: {
            intents: true
          }
        }
      }
    });

    if (!tenant) {
      return corsResponse({ error: 'Tenant not found' }, { status: 404 });
    }

    const visitorConfig = getVisitorConfig(tenant.visitorConfig);

    // Find or create chat session
    let chatSession = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          tenantId,
          contactId: contactId || `widget_${Date.now()}`,
          channel,
          status: 'bot',
        },
      });
    }

    const currentSessionId = chatSession.id;
    const resolvedContactId = contactId || chatSession.contactId;

    // Deduplication check: ignore rapid duplicate messages sent within 2 seconds
    if (typeof prisma.message?.findFirst === 'function') {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      const recentDuplicate = await prisma.message.findFirst({
        where: {
          sessionId: currentSessionId,
          senderType: 'user',
          content: message,
          createdAt: { gte: twoSecondsAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentDuplicate) {
        // Check if a bot reply was already generated for this duplicate
        let recentBotReply = null;
        for (let i = 0; i < 4; i++) {
          recentBotReply = await prisma.message.findFirst({
            where: {
              sessionId: currentSessionId,
              senderType: 'bot',
              createdAt: { gte: recentDuplicate.createdAt },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (recentBotReply) break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        if (recentBotReply) {
          return corsResponse({
            sessionId: currentSessionId,
            messageId: recentBotReply.id,
            status: chatSession.status,
            reply: recentBotReply.content,
            handoffOccurred: false,
            senderName: tenant.activeFlow?.name || 'Claire',
            botName: tenant.activeFlow?.name || 'Claire',
          });
        }

        return corsResponse({
          sessionId: currentSessionId,
          status: chatSession.status,
          reply: '',
          handoffOccurred: false,
        });
      }
    }

    // Save incoming user message
    const savedUserMsg = await prisma.message.create({
      data: {
        sessionId: currentSessionId,
        senderType: 'user',
        content: message,
      },
    });

    // Ensure VisitorProfile exists (useful for internal testing /widget-ui where init doesn't run)
    let existingVisitor: any = null;
    if (resolvedContactId && typeof prisma.visitorProfile?.findUnique === 'function') {
      try {
        existingVisitor = await prisma.visitorProfile.findUnique({
          where: { tenantId_contactId: { tenantId, contactId: resolvedContactId } },
        });
      } catch (err) {
        console.error('[Visitor Tracking] Error fetching existing visitor profile:', err);
      }
    }

    if (visitorConfig.enabled && resolvedContactId) {
      if (!existingVisitor) {
        existingVisitor = await upsertVisitorProfile(tenantId, resolvedContactId, {
          referrerUrl: 'Chat Init',
          pageUrl: 'Widget UI Preview'
        }).catch(err => {
          console.error('[Visitor Tracking] Upsert error:', err);
          return null;
        });
      }
    }

    // Resolve centre from payload, requestWorkspace, emailCenter, or message text
    let detectedCentre = findCentre(requestCentre);
    if (!detectedCentre && requestWorkspace) {
      detectedCentre = findCentre(requestWorkspace);
    }
    if (!detectedCentre && emailCenter) {
      const emailMatches = findCentresByEmail(emailCenter);
      if (emailMatches.length === 1) {
        detectedCentre = emailMatches[0];
      }
    }
    if (!detectedCentre) {
      detectedCentre = detectCentreInText(message);
    }

    let detectedCity = requestCity || detectCityInText(message);
    if (!detectedCity && detectedCentre) {
      detectedCity = detectedCentre.city;
    } else if (!detectedCity && emailCenter) {
      const emailMatches = findCentresByEmail(emailCenter);
      if (emailMatches.length > 0) {
        detectedCity = emailMatches[0].city;
      }
    }

    // Memorize detected centre / city / user profile into VisitorProfile
    if (resolvedContactId) {
      try {
        const rawMeta = existingVisitor?.metadata;
        const currentMeta: Record<string, any> =
          rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)
            ? { ...rawMeta }
            : {};

        const updatedMeta: Record<string, any> = { ...currentMeta };
        if (detectedCentre) {
          updatedMeta.centre = detectedCentre.name;
          updatedMeta.centreBrand = detectedCentre.brand;
          updatedMeta.centreCity = detectedCentre.city;
          updatedMeta.centrePhone = detectedCentre.phone;
          updatedMeta.centreEmail = detectedCentre.email;
          updatedMeta.centreAddress = detectedCentre.address;
          updatedMeta.centreHours = detectedCentre.hours;
        }
        if (detectedCity) {
          updatedMeta.city = detectedCity;
        }
        if (emailCenter) {
          updatedMeta.emailCenter = emailCenter;
        }
        if (visitorCompany) {
          updatedMeta.company = visitorCompany;
        }
        if (requestWorkspace) {
          updatedMeta.workspace = requestWorkspace;
        }

        const visitorUpdateData: any = { metadata: updatedMeta };
        if (detectedCity && !existingVisitor?.city) {
          visitorUpdateData.city = detectedCity;
        }
        if (visitorName && !existingVisitor?.name) {
          visitorUpdateData.name = visitorName;
        }
        if (visitorEmail && !existingVisitor?.email) {
          visitorUpdateData.email = visitorEmail;
        }
        if (visitorPhone && !existingVisitor?.phone) {
          visitorUpdateData.phone = visitorPhone;
        }

        if (existingVisitor) {
          prisma.visitorProfile.update({
            where: { tenantId_contactId: { tenantId, contactId: resolvedContactId } },
            data: visitorUpdateData,
          }).catch(() => {});
        } else if (visitorConfig.enabled) {
          existingVisitor = await prisma.visitorProfile.create({
            data: {
              tenantId,
              contactId: resolvedContactId,
              name: visitorName,
              email: visitorEmail,
              phone: visitorPhone,
              city: detectedCity,
              metadata: updatedMeta,
              sessions: 1,
              messageCount: 1,
              leadScore: 20,
              leadClassification: 'prospect',
            },
          }).catch(() => null);
        }
      } catch (memErr) {
        console.error('[Visitor Tracking] Error memorizing centre profile:', memErr);
      }
    }

    const rawVisitorMeta = existingVisitor?.metadata;
    const visitorMeta: Record<string, any> =
      rawVisitorMeta && typeof rawVisitorMeta === 'object' && !Array.isArray(rawVisitorMeta)
        ? (rawVisitorMeta as Record<string, any>)
        : {};

    const effectiveCentre =
      detectedCentre?.name ||
      requestCentre ||
      findCentre(requestWorkspace)?.name ||
      visitorMeta.centre ||
      visitorMeta.centreName;
    const effectiveCity =
      detectedCity ||
      requestCity ||
      existingVisitor?.city ||
      visitorMeta.city ||
      (effectiveCentre ? findCentre(effectiveCentre)?.city : null);
    const finalVisitorName = visitorName || existingVisitor?.name || null;
    const finalVisitorEmail = visitorEmail || existingVisitor?.email || null;
    const finalVisitorCompany = visitorCompany || visitorMeta?.company || null;

    // Phase 3: Layer 2 - NLP Extraction (Fire and forget, wrap in try/catch to be non-blocking)
    if (visitorConfig.enabled && visitorConfig.layer2_nlp && resolvedContactId) {
      try {
        const extractedData = extractVisitorData(message, visitorConfig);
        if (Object.keys(extractedData).length > 0) {
          // Fire and forget update
          updateVisitorFromExtraction(tenantId, resolvedContactId, extractedData).catch(err => {
            console.error('[Visitor Tracking] Background extraction error:', err);
          });
        }
        
        // Also update last seen and message count
        prisma.visitorProfile.update({
          where: { tenantId_contactId: { tenantId, contactId: resolvedContactId } },
          data: { 
            lastSeenAt: new Date(),
            messageCount: { increment: 1 }
          }
        }).catch(() => {}); // Ignore errors
      } catch (err) {
        console.error('[Visitor Tracking] Extraction error:', err);
      }
    }

    // Broadcast user message to agent dashboard and other listeners immediately
    // Supabase Realtime will handle this via postgres_changes automatically (if replication is enabled).
    // We removed the explicit channel.send() broadcast here because it was blocking the API response
    // when the Supabase WebSocket ACK took too long, causing a 5-10s delay.

    // === JIKA SESI SUDAH DI-HANDLE OLEH HUMAN AGENT ===
    if (chatSession.status === 'agent') {
      // Forward ke dashboard agent via Socket.io
      // Supabase Realtime handles this automatically.
      return corsResponse({
        sessionId: currentSessionId,
        status: 'agent',
        reply: null, // Agent akan membalas sendiri dari dashboard
        handoffOccurred: false,
      });
    }

    // Fetch active flow config if present (falling back to flows[0] if activeFlowId is not set)
    const effectiveFlow = tenant.activeFlow || tenant.flows?.[0];
    const flowConfig: any = effectiveFlow?.config || {};
    const flowSystemPrompt = flowConfig.systemPrompt;
    const flowHumanPromptTemplate = flowConfig.humanPrompt;
    const rawLang =
      (tenant.visitorConfig as any)?.language ||
      flowConfig?.language ||
      ((effectiveFlow?.name || '').toLowerCase().includes('ceosuite') ? 'en' : 'en');
    const isEn = !String(rawLang || '').toLowerCase().startsWith('id');

    // === SESI DALAM MODE BOT — JALANKAN AI ===

    // Step 1: Check QnA (Intents) from flow builder first
    let qnaMatch = null;
    if (effectiveFlow && effectiveFlow.intents) {
      const userMsgLower = message.toLowerCase().trim();
      let maxMatchLength = 0;
      
      for (const intent of effectiveFlow.intents) {
        const lowerIntentName = (intent.name || '').toLowerCase().trim();
        if (userMsgLower === lowerIntentName) {
          qnaMatch = intent;
          maxMatchLength = Infinity;
          break;
        }

        if (!intent.trainingPhrases || !Array.isArray(intent.trainingPhrases)) continue;
        
        for (const phrase of intent.trainingPhrases) {
          const lowerPhrase = phrase.toLowerCase().trim();
          if (userMsgLower === lowerPhrase) {
            qnaMatch = intent;
            maxMatchLength = Infinity;
            break;
          } else if (!tenant.aiEnabled && userMsgLower.includes(lowerPhrase)) {
            if (lowerPhrase.length > maxMatchLength) {
              maxMatchLength = lowerPhrase.length;
              qnaMatch = intent;
            }
          }
        }
        if (maxMatchLength === Infinity) break;
      }
    }

    // Step 2: Quick keyword check untuk handoff jika tidak cocok dengan intent flow spesifik
    if (!qnaMatch) {
      const ruleCheck = checkHandoffIntent(message);

      if (ruleCheck.intent === 'handoff_requested') {
        const isHandoffEnabled = tenant.humanHandoffEnabled ?? true;
        const resolvedCentre = findCentre(effectiveCentre);
        const effectiveHandoffEmail = emailCenter || resolvedCentre?.email || tenant.fallbackEmail;

        if (!isHandoffEnabled) {
          const dynamicResult = resolveDynamicHandoff({
            baseResponse: isEn
              ? (effectiveHandoffEmail
                  ? `For personal assistance, our on-duty front desk team would be pleased to assist you directly via email at ${effectiveHandoffEmail} or phone.`
                  : 'For personal assistance, our team would be pleased to assist you directly. Please leave a message with your contact details.')
              : (effectiveHandoffEmail
                  ? `Untuk bantuan personal, tim front desk kami siap membantu Anda via email di ${effectiveHandoffEmail} atau telepon.`
                  : 'Untuk bantuan personal, tim kami siap membantu Anda. Silakan tinggalkan pesan beserta kontak Anda.'),
            centre: effectiveCentre,
            city: effectiveCity,
            emailCenter: effectiveHandoffEmail,
            isEn,
            humanHandoffEnabled: false,
          });

          const replyMsg = dynamicResult.reply;

          await prisma.message.create({
            data: {
              sessionId: currentSessionId,
              senderType: 'bot',
              content: replyMsg,
            },
          });

          const dynamicQuickOptions = dynamicResult.options ? parseOptions(dynamicResult.options) : [];

          return corsResponse({
            sessionId: currentSessionId,
            status: 'bot',
            reply: replyMsg,
            options: channel !== 'widget' ? dynamicQuickOptions : undefined,
            handoffOccurred: false,
            humanHandoffEnabled: false,
            fallbackEmail: effectiveHandoffEmail || null,
            emailCenter: effectiveHandoffEmail || null,
            centre: effectiveCentre || null,
            city: effectiveCity || null,
          });
        }

        // Update session status ke 'queue' untuk diambil agent
        await prisma.chatSession.update({
          where: { id: currentSessionId },
          data: { status: 'queue' },
        });

        const agentName = tenant.handoffAgent?.name
          ? (isEn ? `, ${tenant.handoffAgent.name}` : ` bernama ${tenant.handoffAgent.name}`)
          : '';
        const handoffMessage = isEn
          ? `Sure, I will connect you with our customer support team${agentName} right away. Please wait a moment! 😊`
          : `Baik, saya akan segera menghubungkan Anda dengan agen kami${agentName}. Mohon tunggu sebentar ya! 😊`;

        const dynamicResult = resolveDynamicHandoff({
          baseResponse: handoffMessage,
          centre: effectiveCentre,
          city: effectiveCity,
          emailCenter: effectiveHandoffEmail,
          isEn,
          humanHandoffEnabled: true,
        });

        const finalHandoffReply = dynamicResult.reply;

        const savedHandoffMsg = await prisma.message.create({
          data: {
            sessionId: currentSessionId,
            senderType: 'bot',
            content: finalHandoffReply,
          },
        });

        const dynamicQuickOptions = dynamicResult.options ? parseOptions(dynamicResult.options) : [];

        return corsResponse({
          sessionId: currentSessionId,
          messageId: savedHandoffMsg.id,
          status: 'queue',
          reply: finalHandoffReply,
          options: channel !== 'widget' ? dynamicQuickOptions : undefined,
          handoffOccurred: true,
          handoffReason: ruleCheck.reason,
          emailCenter: effectiveHandoffEmail || null,
          centre: effectiveCentre || null,
          city: effectiveCity || null,
        });
      }
    }

    const qnaMeta = qnaMatch?.metadata as Record<string, any> | null | undefined;
    if (qnaMeta?.centre && resolvedContactId) {
      const intentCentre = findCentre(qnaMeta.centre as string);
      if (intentCentre) {
        prisma.visitorProfile.update({
          where: { tenantId_contactId: { tenantId, contactId: resolvedContactId } },
          data: {
            metadata: {
              ...visitorMeta,
              centre: intentCentre.name,
              centreBrand: intentCentre.brand,
              city: intentCentre.city,
              centrePhone: intentCentre.phone,
              centreEmail: intentCentre.email,
              centreAddress: intentCentre.address,
              centreHours: intentCentre.hours,
            },
            city: intentCentre.city,
          },
        }).catch(() => {});
      }
    }

    let finalCustomInstructions = tenant.aiSystemPrompt || '';
    if (flowSystemPrompt) {
      finalCustomInstructions += `\n\n[Specific Agent Instructions]\n${flowSystemPrompt}`;
    }

    // Tell the LLM how to parse the UI pipe syntax if it reads it from RAG documents
    finalCustomInstructions += `\n\n[IMPORTANT UI FORMATTING RULE]\nIf you read options or locations from your knowledge base that contain a pipe character (e.g. 'Bangkok|Bangkok Private Office'), DO NOT output the pipe or the value after it. ONLY output the friendly label before the pipe (e.g. 'Bangkok'). Never output 'Label|Value' in your response.`;

    // Inject User Profile & Memorized Centre Context so the AI Agent Proxy can answer dynamically
    const resolvedCentreInfo = findCentre(effectiveCentre);
    if (effectiveCentre || effectiveCity || finalVisitorName || finalVisitorCompany || requestWorkspace) {
      finalCustomInstructions += `\n\n[USER PROFILE & MEMORIZED CENTRE CONTEXT]\n` +
        (finalVisitorName ? `• Visitor Name: ${finalVisitorName}\n` : '') +
        (finalVisitorCompany ? `• Company: ${finalVisitorCompany}\n` : '') +
        (finalVisitorEmail ? `• Email: ${finalVisitorEmail}\n` : '') +
        (effectiveCity ? `• City / Location: ${effectiveCity}\n` : '') +
        (effectiveCentre ? `• Workspace Centre: ${effectiveCentre}\n` : '') +
        (requestWorkspace ? `• Active Workspace: ${requestWorkspace}\n` : '');

      if (resolvedCentreInfo) {
        finalCustomInstructions +=
          `• Centre Front Desk Phone: ${resolvedCentreInfo.phone}\n` +
          `• Centre Email: ${resolvedCentreInfo.email}\n` +
          `• Centre Operating Hours: ${resolvedCentreInfo.hours}\n` +
          `• Centre Address: ${resolvedCentreInfo.address}\n`;
      }
      finalCustomInstructions += `\nGUIDANCE FOR AI CONVERSATION:\n` +
        `- When answering, personalize your responses to their workspace centre (${effectiveCentre || effectiveCity || 'their centre'}) whenever relevant.\n` +
        `- If the user inquires about centre facilities, operating hours, reception, or urgent assistance, reference their specific centre details above.\n` +
        `- Address the user respectfully by name if known.\n` +
        `- Maintain a warm, highly professional, executive concierge demeanor.`;
    }

    // Build full prompt with context (We only need the system prompt, AI proxy handles history natively)
    const effectiveEmailForPrompt = emailCenter || tenant.fallbackEmail;
    const systemPrompt = buildSystemPrompt({
      tenantName: tenant.name,
      botName: effectiveFlow?.name || 'Claire',
      customInstructions: finalCustomInstructions.trim() || undefined,
      handoffAgentName: tenant.handoffAgent?.name,
      humanHandoffEnabled: tenant.humanHandoffEnabled ?? true,
      fallbackEmail: effectiveEmailForPrompt || undefined,
      language: flowConfig.language,
      speakingStyle: flowConfig.speakingStyle,
      businessNeeds: flowConfig.businessNeeds,
      enableClassification: visitorConfig.enabled && visitorConfig.layer4_classification,
      enableExtraction: visitorConfig.enabled && visitorConfig.layer2_nlp,
    });

    let formattedMessage = message;
    if (flowHumanPromptTemplate) {
      formattedMessage = flowHumanPromptTemplate.replace('{input}', message);
    }

    let aiReplyRaw = '';
    let handoffOccurred = false;

    if (tenant.aiEnabled) {
      const effectiveFlowId = tenant.activeFlowId || effectiveFlow?.id;

      let dynamicSystemPrompt = systemPrompt;
      let bypassLLM = false;

      if (qnaMatch) {
        const userMsgLower = message.toLowerCase().trim();
        const lowerIntentName = (qnaMatch.name || '').toLowerCase().trim();

        // Check if this is an explicit menu button click or fixed form/card UI
        const isMenuClick =
          userMsgLower === lowerIntentName ||
          userMsgLower.startsWith('cs:') ||
          userMsgLower.startsWith('faq:') ||
          userMsgLower.startsWith('po centre:') ||
          userMsgLower.startsWith('po city:') ||
          userMsgLower.startsWith('city directory:') ||
          userMsgLower.startsWith('direct:') ||
          userMsgLower.startsWith('front desk:') ||
          ['form', 'card'].includes(qnaMatch.responseType);

        if (isMenuClick) {
          // Bypass LLM for instant button navigation and structured forms/cards
          bypassLLM = true;
          aiReplyRaw = qnaMatch.response;
          if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
            aiReplyRaw += ' [HANDOFF_REQUESTED]';
          }
        } else {
          // The user typed a free-form message! Let the AI Agent Proxy generate a dynamic, conversational response
          let referenceResponse = qnaMatch.response;
          if (qnaMatch.responseType === 'handoff' && !referenceResponse.includes('[HANDOFF_REQUESTED]')) {
            referenceResponse += ' [HANDOFF_REQUESTED]';
          }

          dynamicSystemPrompt += `\n\n[USER INTENT MATCHED: ${qnaMatch.name}]\n` +
            `The user's query matched intent '${qnaMatch.name}'.\n` +
            `Core factual reference:\n"${referenceResponse}"\n\n` +
            `INSTRUCTION:\n` +
            `- Provide a dynamic, friendly, natural, and helpful answer that directly addresses the user's specific query.\n` +
            `- Use the core factual reference above as the truth.\n` +
            `- If this is a customer service handoff or issue report, acknowledge their specific problem with empathy, confirm that our CS team is stepping in, offer their centre front desk hotline (${resolvedCentreInfo?.phone || 'reception'}) for urgent on-site support, and append [HANDOFF_REQUESTED] at the end.\n` +
            `- Keep the tone executive, warm, and professional.`;
        }
      }

      if (!bypassLLM) {
        // Retrieve previous conversation history turns for this session
        let conversationHistory: Array<{ role: string; content: string }> = [];
        try {
          const previousDbMessages = await prisma.message.findMany({
            where: {
              sessionId: currentSessionId,
              id: { not: savedUserMsg.id },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          conversationHistory = (previousDbMessages || [])
            .slice()
            .reverse()
            .map((m) => {
              const cleanContent = m.content
                .replace(/<[^>]*>/g, '')
                .replace(/\[HANDOFF_REQUESTED\]/g, '')
                .trim();
              return {
                role: m.senderType === 'user' ? 'user' : 'assistant',
                content: cleanContent,
              };
            })
            .filter((m) => m.content.length > 0);
        } catch (histErr) {
          console.error('[Widget Message] Failed to fetch session history:', histErr);
        }

        // Step 3: Call AI Engine (Session, RAG, etc)
        const defaultUnavailableMsg = isEn
          ? 'Sorry, I am unable to answer at the moment.'
          : 'Maaf, saya tidak bisa menjawab saat ini.';
        const defaultFailureMsg = isEn
          ? 'Sorry, our AI system is currently experiencing issues. I will connect you to our support team. [HANDOFF_REQUESTED]'
          : 'Maaf, sistem AI kami sedang mengalami gangguan. Saya akan menghubungkan Anda ke agen kami. [HANDOFF_REQUESTED]';

        try {
          const aiResponse = await chatWithAgent({
            message: formattedMessage, // Send the formatted message if human prompt exists
            session_id: currentSessionId,
            user_id: chatSession.contactId,
            tenant_id: tenantId,
            flow_id: effectiveFlowId || undefined,  // RAG isolation: scope to active AI Bot
            system_prompt: dynamicSystemPrompt,
            history: conversationHistory,
          });

          if (aiResponse.reply && aiResponse.intent !== 'offline_fallback') {
            aiReplyRaw = aiResponse.reply;
          } else if (qnaMatch) {
            // Graceful fallback to matched intent response if proxy is offline
            aiReplyRaw = qnaMatch.response;
            if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
              aiReplyRaw += ' [HANDOFF_REQUESTED]';
            }
          } else {
            aiReplyRaw = flowConfig?.defaultResponse || defaultUnavailableMsg;
          }
        } catch (aiError) {
          console.error('[Widget Message] AI Engine error:', aiError);
          if (qnaMatch) {
            aiReplyRaw = qnaMatch.response;
            if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
              aiReplyRaw += ' [HANDOFF_REQUESTED]';
            }
          } else {
            aiReplyRaw = flowConfig?.defaultResponse || defaultFailureMsg;
          }
        }
      }

    } else {
      // If AI Agent is not enabled, directly fallback to static message (much faster!)
      if (qnaMatch) {
        aiReplyRaw = qnaMatch.response;
        if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
          aiReplyRaw += ' [HANDOFF_REQUESTED]';
        }
      } else {
        aiReplyRaw = flowConfig?.defaultResponse || 'Maaf, saya belum mengerti pesan Anda. Apakah Anda ingin berbicara dengan agen kami? [HANDOFF_REQUESTED]';
      }
    }

    // Resolve dynamic personalized handoff if handoff is requested or intent is human agent support
    let dynamicOptionsOverride: string | null = null;
    if (aiReplyRaw.includes('[HANDOFF_REQUESTED]') || qnaMatch?.name === 'CS: Speak to Human Agent / Live Support') {
      const dynamicResult = resolveDynamicHandoff({
        baseResponse: aiReplyRaw,
        centre: effectiveCentre,
        city: effectiveCity,
        emailCenter,
        isEn,
        baseOptions: qnaMatch?.options || '',
        humanHandoffEnabled: tenant.humanHandoffEnabled ?? true,
      });

      if (dynamicResult.dynamicallyResolved) {
        aiReplyRaw = dynamicResult.reply;
        if (dynamicResult.options) {
          dynamicOptionsOverride = dynamicResult.options;
        }
      }
    }

    // Step 4: Parse AI response for handoff flag, classification, and data extraction
    const { cleanReply: parsedExtraction, extractedData } = parseDataExtractionTag(aiReplyRaw);
    const { cleanReply: parsedClassification, classification } = parseClassificationTag(parsedExtraction);
    const { cleanReply: textReply, handoffRequested } = parseAIResponseForHandoff(parsedClassification);

    // Quick-reply buttons from the matched intent ("Label|Value" supported: the
    // button shows Label but sends Value back as the user's message).
    //  - web widget (channel 'widget') renders HTML, so buttons are appended to the reply as before
    //  - every other channel (e.g. mobile_app) gets clean text plus a structured `options` array
    const rawOptionsString = dynamicOptionsOverride ?? qnaMatch?.options ?? '';
    const quickOptions = rawOptionsString ? parseOptions(rawOptionsString) : [];
    const useLegacyHtml = channel === 'widget';
    let cleanReply = useLegacyHtml && quickOptions.length > 0
      ? textReply + toLegacyHtml(quickOptions)
      : textReply;
    const structuredOptions = !useLegacyHtml ? quickOptions : [];
    const matchedType: string = qnaMatch?.responseType ?? '';
    const isCard = matchedType === 'card' || cleanReply.includes("class='card'") || cleanReply.includes('class="card"');
    const isForm = matchedType === 'form' || cleanReply.includes("class='form-card'") || cleanReply.includes('class="form-card"');
    const responseType = isCard
      ? 'card'
      : isForm
      ? 'form'
      : quickOptions.length > 0 ? 'options' : 'text';

    let triggerLeadForm = false;
    let leadFormConfig = null;

    if (Object.keys(extractedData).length > 0 && resolvedContactId) {
      updateVisitorFromExtraction(tenantId, resolvedContactId, extractedData).catch(err => {
        console.error('[Visitor Tracking] Background AI data extraction update error:', err);
      });
    }

    if (classification && resolvedContactId) {
      // Background classification update
      updateVisitorClassification(tenantId, resolvedContactId, classification, visitorConfig).catch(err => {
        console.error('[Visitor Tracking] Background classification update error:', err);
      });

      // Layer 3 - Contextual Lead Form (check synchronously since we need to return it in response)
      try {
        const shouldTrigger = await shouldTriggerLeadForm(tenantId, resolvedContactId, classification, visitorConfig);
        if (shouldTrigger) {
          triggerLeadForm = true;
          leadFormConfig = {
            fields: visitorConfig.leadFormFields,
            title: visitorConfig.leadFormTitle,
            skippable: visitorConfig.leadFormSkippable
          };
          
          // Mark as shown so it doesn't trigger again
          await prisma.visitorProfile.update({
            where: { tenantId_contactId: { tenantId, contactId: resolvedContactId } },
            data: { leadFormShown: true }
          });
        }
      } catch (err) {
        console.error('[Visitor Tracking] Lead form trigger error:', err);
      }
    }

    if (handoffRequested) {
      if (tenant.humanHandoffEnabled ?? true) {
        // Update session status
        await prisma.chatSession.update({
          where: { id: currentSessionId },
          data: { status: 'queue' },
        });
        handoffOccurred = true;

        // Notify agent dashboard
        // Supabase Realtime handles this automatically.
      } else {
        handoffOccurred = false;
        if (tenant.fallbackEmail && !cleanReply.toLowerCase().includes(tenant.fallbackEmail.toLowerCase())) {
          const emailNotice = isEn
            ? `\n\n(For further personal assistance, our team is at your service via email at ${tenant.fallbackEmail})`
            : `\n\n(Untuk bantuan lebih lanjut, tim kami siap membantu Anda via email di ${tenant.fallbackEmail})`;
          cleanReply += emailNotice;
        }
      }
    }

    // Step 5: Save AI reply to database
    const savedBotMessage = await prisma.message.create({
      data: {
        sessionId: currentSessionId,
        senderType: 'bot',
        content: cleanReply,
      },
    });

    // Step 6: Supabase Realtime automatically broadcasts changes

    const dynamicBotName = flowConfig?.name || tenant.activeFlow?.name || 'Claire';

    return corsResponse({
      sessionId: currentSessionId,
      messageId: savedBotMessage.id,
      status: handoffOccurred ? 'queue' : 'bot',
      reply: cleanReply,
      responseType,
      ...(structuredOptions.length > 0 && { options: structuredOptions }),
      handoffOccurred,
      senderName: handoffOccurred ? undefined : dynamicBotName,
      botName: dynamicBotName,
      triggerLeadForm,
      ...(triggerLeadForm && { leadFormConfig })
    });
  } catch (error) {
    console.error('[Widget Message API] Error:', error);
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
