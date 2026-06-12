import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { chatWithAgent } from '@/lib/ai-agent';
import {
  checkHandoffIntent,
  buildSystemPrompt,
  parseAIResponseForHandoff,
} from '@/lib/ai-rules';

const prisma = new PrismaClient();

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
    const body = await req.json();
    const { sessionId, tenantId, message, contactId, channel = 'widget' } = body;

    if (!tenantId || !message) {
      return NextResponse.json(
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
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

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

    // Save incoming user message
    const savedUserMsg = await prisma.message.create({
      data: {
        sessionId: currentSessionId,
        senderType: 'user',
        content: message,
      },
    });

    // Broadcast user message to agent dashboard and other listeners immediately
    const io = (global as any).socketIO;
    if (io) {
      io.to(`inbox:${tenantId}`).emit('widget_message', {
        sessionId: currentSessionId,
        message,
        timestamp: savedUserMsg.createdAt,
        source: 'widget'
      });
      io.to(`session:${currentSessionId}`).emit('user_message', {
        sessionId: currentSessionId,
        message,
        senderType: 'user',
        timestamp: savedUserMsg.createdAt.toISOString()
      });
    }

    // === JIKA SESI SUDAH DI-HANDLE OLEH HUMAN AGENT ===
    if (chatSession.status === 'agent') {
      // Forward ke dashboard agent via Socket.io
      const io = (global as any).socketIO;
      if (io) {
        io.to(`session:${currentSessionId}`).emit('user_message', {
          sessionId: currentSessionId,
          message,
          tenantId,
          senderType: 'user',
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        sessionId: currentSessionId,
        status: 'agent',
        reply: null, // Agent akan membalas sendiri dari dashboard
        handoffOccurred: false,
      });
    }

    // === SESI DALAM MODE BOT — JALANKAN AI ===

    // Step 1: Quick keyword check untuk handoff (tanpa harus panggil LLM dulu)
    const ruleCheck = checkHandoffIntent(message);

    if (ruleCheck.intent === 'handoff_requested') {
      // Update session status ke 'queue' untuk diambil agent
      await prisma.chatSession.update({
        where: { id: currentSessionId },
        data: { status: 'queue' },
      });

      const agentName = tenant.handoffAgent?.name ? ` bernama ${tenant.handoffAgent.name}` : '';
      const handoffMessage =
        `Baik, saya akan segera menghubungkan Anda dengan agen kami${agentName}. Mohon tunggu sebentar ya! 😊`;

      await prisma.message.create({
        data: {
          sessionId: currentSessionId,
          senderType: 'bot',
          content: handoffMessage,
        },
      });

      // Notify agent dashboard via Socket.io
      const io = (global as any).socketIO;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('handoff_requested', {
          sessionId: currentSessionId,
          tenantId,
          contactId: chatSession.contactId,
          channel,
          lastMessage: message,
          timestamp: new Date().toISOString(),
          reason: ruleCheck.reason,
        });
      }

      return NextResponse.json({
        sessionId: currentSessionId,
        status: 'queue',
        reply: handoffMessage,
        handoffOccurred: true,
        handoffReason: ruleCheck.reason,
      });
    }

    // Fetch active flow config if present
    const flowConfig: any = tenant.activeFlow?.config || {};
    const flowSystemPrompt = flowConfig.systemPrompt;
    const flowHumanPromptTemplate = flowConfig.humanPrompt;

    let finalCustomInstructions = tenant.aiSystemPrompt || '';
    if (flowSystemPrompt) {
      finalCustomInstructions += `\n\n[Specific Agent Instructions]\n${flowSystemPrompt}`;
    }

    // Build full prompt with context (We only need the system prompt, AI proxy handles history natively)
    const systemPrompt = buildSystemPrompt({
      tenantName: tenant.name,
      botName: tenant.activeFlow?.name || 'Asisten AI',
      customInstructions: finalCustomInstructions.trim() || undefined,
      handoffAgentName: tenant.handoffAgent?.name,
      language: flowConfig.language,
      speakingStyle: flowConfig.speakingStyle,
      businessNeeds: flowConfig.businessNeeds,
    });

    let formattedMessage = message;
    if (flowHumanPromptTemplate) {
      formattedMessage = flowHumanPromptTemplate.replace('{input}', message);
    }

    // Step 2: Check QnA (Intents)
    let qnaMatch = null;
    
    // 2a. Check DB Intents first
    if (tenant.activeFlow && tenant.activeFlow.intents) {
      const userMsgLower = message.toLowerCase().trim();
      let maxMatchLength = 0;
      
      for (const intent of tenant.activeFlow.intents) {
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


    let aiReplyRaw = '';
    let handoffOccurred = false;

    if (tenant.aiEnabled) {
      // Fetch document IDs associated with the active flow for RAG isolation
      let documentIds: string[] = [];
      if (tenant.activeFlowId) {
        const docs = await prisma.knowledgeDocument.findMany({
          where: { flowId: tenant.activeFlowId, status: 'ready' },
          select: { proxyDocId: true }
        });
        documentIds = docs.map(d => d.proxyDocId).filter((id): id is string => id !== null);
      }

      let dynamicSystemPrompt = systemPrompt;
      if (qnaMatch) {
        let referenceResponse = qnaMatch.response;
        if (qnaMatch.responseType === 'handoff' && !referenceResponse.includes('[HANDOFF_REQUESTED]')) {
          referenceResponse += ' [HANDOFF_REQUESTED]';
        }
        dynamicSystemPrompt += `\n\n[USER INTENT MATCHED]\nThe user's request matches the intent '${qnaMatch.name}'. Use the following pre-defined response as the core factual reference for your answer: "${referenceResponse}". Rewrite it to be conversational, natural, and directly address the user's message while maintaining the exact same facts, prices, and questions.`;
      }

      // Step 3: Call AI Engine (Session, RAG, etc)
      try {
        const aiResponse = await chatWithAgent({
          message: formattedMessage, // Send the formatted message if human prompt exists
          session_id: currentSessionId,
          user_id: chatSession.contactId,
          tenant_id: tenantId,
          system_prompt: dynamicSystemPrompt,
          document_ids: documentIds,
        });

        aiReplyRaw = aiResponse.reply || flowConfig?.defaultResponse || 'Maaf, saya tidak bisa menjawab saat ini.';

        // Re-append HTML options from QnA match if any
        if (qnaMatch && qnaMatch.options) {
          const opts = qnaMatch.options.split(',').map((o: string) => o.trim()).filter(Boolean);
          if (opts.length > 0) {
            aiReplyRaw += `<div class="flex flex-wrap gap-2 mt-3">` + opts.map((o: string) => `<button class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors" onclick="window.postMessage({type: 'widget_quick_reply', text: '${o}'}, '*')">${o}</button>`).join('') + `</div>`;
          }
        }
      } catch (aiError) {
        console.error('[Widget Message] AI Engine error:', aiError);
        aiReplyRaw = flowConfig?.defaultResponse || 'Maaf, sistem AI kami sedang mengalami gangguan. Saya akan menghubungkan Anda ke agen kami. [HANDOFF_REQUESTED]';
      }
    } else {
      // If AI Agent is not enabled, directly fallback to static message (much faster!)
      if (qnaMatch) {
        aiReplyRaw = qnaMatch.response;
        if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
          aiReplyRaw += ' [HANDOFF_REQUESTED]';
        }
        if (qnaMatch.options) {
          const opts = qnaMatch.options.split(',').map((o: string) => o.trim()).filter(Boolean);
          if (opts.length > 0) {
            aiReplyRaw += `<div class="flex flex-wrap gap-2 mt-3">` + opts.map((o: string) => `<button class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors" onclick="window.postMessage({type: 'widget_quick_reply', text: '${o}'}, '*')">${o}</button>`).join('') + `</div>`;
          }
        }
      } else {
        aiReplyRaw = flowConfig?.defaultResponse || 'Maaf, saya belum mengerti pesan Anda. Apakah Anda ingin berbicara dengan agen kami? [HANDOFF_REQUESTED]';
      }
    }

    // Step 4: Parse AI response for handoff flag
    const { cleanReply, handoffRequested } = parseAIResponseForHandoff(aiReplyRaw);

    if (handoffRequested) {
      // Update session status
      await prisma.chatSession.update({
        where: { id: currentSessionId },
        data: { status: 'queue' },
      });
      handoffOccurred = true;

      // Notify agent dashboard
      const io = (global as any).socketIO;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('handoff_requested', {
          sessionId: currentSessionId,
          tenantId,
          contactId: chatSession.contactId,
          channel,
          lastMessage: message,
          aiReply: cleanReply,
          timestamp: new Date().toISOString(),
          reason: 'AI-flagged handoff',
        });
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

    // Step 6: Emit AI reply to the widget session via Socket.io (for real-time update)
    if (io) {
      io.to(`session:${currentSessionId}`).emit('bot_reply', {
        sessionId: currentSessionId,
        message: cleanReply,
        senderType: 'bot',
        timestamp: savedBotMessage.createdAt.toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: currentSessionId,
      status: handoffOccurred ? 'queue' : 'bot',
      reply: cleanReply,
      handoffOccurred,
    });
  } catch (error) {
    console.error('[Widget Message API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
