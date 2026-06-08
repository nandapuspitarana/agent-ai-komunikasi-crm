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
        activeFlow: true
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
    });

    let formattedMessage = message;
    if (flowHumanPromptTemplate) {
      formattedMessage = flowHumanPromptTemplate.replace('{input}', message);
    }

    // Step 3: Call AI Engine
    let aiReplyRaw = '';
    let handoffOccurred = false;

    try {
      const aiResponse = await chatWithAgent({
        message: formattedMessage, // Send the formatted message if human prompt exists
        session_id: currentSessionId,
        user_id: chatSession.contactId,
        tenant_id: tenantId,
        system_prompt: systemPrompt,
      });

      aiReplyRaw = aiResponse.reply || 'Maaf, saya tidak bisa menjawab saat ini.';
    } catch (aiError) {
      console.error('[Widget Message] AI Engine error:', aiError);
      aiReplyRaw =
        'Maaf, sistem AI kami sedang mengalami gangguan. Saya akan menghubungkan Anda ke agen kami.  [HANDOFF_REQUESTED]';
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
