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
import { extractVisitorData } from '@/lib/visitor-extractor';
import { updateVisitorFromExtraction, upsertVisitorProfile, updateVisitorClassification, shouldTriggerLeadForm } from '@/lib/visitor-service';

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

    // Save incoming user message
    const savedUserMsg = await prisma.message.create({
      data: {
        sessionId: currentSessionId,
        senderType: 'user',
        content: message,
      },
    });

    // Ensure VisitorProfile exists (useful for internal testing /widget-ui where init doesn't run)
    if (visitorConfig.enabled && resolvedContactId) {
      await upsertVisitorProfile(tenantId, resolvedContactId, {
        referrerUrl: 'Chat Init',
        pageUrl: 'Widget UI Preview'
      }).catch(err => console.error('[Visitor Tracking] Upsert error:', err));
    }

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
    // Supabase Realtime will handle this via postgres_changes automatically (if replication is enabled),
    // but to guarantee delivery we also fire an explicit Broadcast event.
    try {
      const { supabase } = await import('@/lib/supabase-client');
      const channel = supabase.channel(`global_notifications_${tenantId}`);
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: savedUserMsg.id,
          sessionId: currentSessionId,
          tenantId: tenantId,
          senderType: 'user',
          content: message,
          createdAt: savedUserMsg.createdAt.toISOString()
        }
      });
      // Also broadcast to inbox channel for older clients
      const inboxChannel = supabase.channel(`inbox_${tenantId}`);
      await inboxChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: savedUserMsg.id,
          sessionId: currentSessionId,
          tenantId: tenantId,
          senderType: 'user',
          content: message,
          createdAt: savedUserMsg.createdAt.toISOString()
        }
      });
    } catch (err) {
      console.error('[Broadcast] Failed to emit real-time event:', err);
    }

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

      // Notify agent dashboard
      // Supabase Realtime handles this automatically.

      return corsResponse({
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

    // Tell the LLM how to parse the UI pipe syntax if it reads it from RAG documents
    finalCustomInstructions += `\n\n[IMPORTANT UI FORMATTING RULE]\nIf you read options or locations from your knowledge base that contain a pipe character (e.g. 'Bangkok|Bangkok Private Office'), DO NOT output the pipe or the value after it. ONLY output the friendly label before the pipe (e.g. 'Bangkok'). Never output 'Label|Value' in your response.`;

    // Build full prompt with context (We only need the system prompt, AI proxy handles history natively)
    const systemPrompt = buildSystemPrompt({
      tenantName: tenant.name,
      botName: tenant.activeFlow?.name || 'Asisten AI',
      customInstructions: finalCustomInstructions.trim() || undefined,
      handoffAgentName: tenant.handoffAgent?.name,
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
      let bypassLLM = false;

      if (qnaMatch) {
        if (['form', 'options', 'card'].includes(qnaMatch.responseType)) {
          // Bypass LLM for rich UI responses to prevent HTML stripping
          bypassLLM = true;
          aiReplyRaw = qnaMatch.response;
          if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
            aiReplyRaw += ' [HANDOFF_REQUESTED]';
          }
        } else {
          // For simple text, let LLM rewrite it conversationally
          let referenceResponse = qnaMatch.response;
          if (qnaMatch.responseType === 'handoff' && !referenceResponse.includes('[HANDOFF_REQUESTED]')) {
            referenceResponse += ' [HANDOFF_REQUESTED]';
          }
          dynamicSystemPrompt += `\n\n[USER INTENT MATCHED]\nThe user's request matches the intent '${qnaMatch.name}'. Use the following pre-defined response as the core factual reference for your answer: "${referenceResponse}". Rewrite it to be conversational, natural, and directly address the user's message while maintaining the exact same facts, prices, and questions.`;
        }
      }

      if (!bypassLLM) {
        // Step 3: Call AI Engine (Session, RAG, etc)
        try {
          const aiResponse = await chatWithAgent({
            message: formattedMessage, // Send the formatted message if human prompt exists
            session_id: currentSessionId,
            user_id: chatSession.contactId,
            tenant_id: tenantId,
            flow_id: tenant.activeFlowId || undefined,  // RAG isolation: scope to active AI Bot
            system_prompt: dynamicSystemPrompt,
            document_ids: documentIds,
          });

          aiReplyRaw = aiResponse.reply || flowConfig?.defaultResponse || 'Maaf, saya tidak bisa menjawab saat ini.';
        } catch (aiError) {
          console.error('[Widget Message] AI Engine error:', aiError);
          aiReplyRaw = flowConfig?.defaultResponse || 'Maaf, sistem AI kami sedang mengalami gangguan. Saya akan menghubungkan Anda ke agen kami. [HANDOFF_REQUESTED]';
        }
      }

      // Re-append HTML options from QnA match if any
      // Supports "Label|Value" format: button shows Label, but sends Value to intent matcher
      if (qnaMatch && qnaMatch.options) {
        const opts = qnaMatch.options.split(',').map((o: string) => o.trim()).filter(Boolean);
        if (opts.length > 0) {
          aiReplyRaw += `<div class="flex flex-wrap gap-2 mt-3">` + opts.map((o: string) => {
            const pipeIdx = o.indexOf('|');
            const label = pipeIdx !== -1 ? o.substring(0, pipeIdx).trim() : o;
            const value = pipeIdx !== -1 ? o.substring(pipeIdx + 1).trim() : o;
            return `<button class="px-3 py-1.5 text-xs font-medium text-brand bg-brand-bg hover:bg-brand-bg border border-brand/30 rounded-full transition-colors" onclick="window.postMessage({type: 'widget_quick_reply', text: '${value}'}, '*')">${label}</button>`;
          }).join('') + `</div>`;
        }
      }

    } else {
      // If AI Agent is not enabled, directly fallback to static message (much faster!)
      if (qnaMatch) {
        aiReplyRaw = qnaMatch.response;
        if (qnaMatch.responseType === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
          aiReplyRaw += ' [HANDOFF_REQUESTED]';
        }
        if (qnaMatch.options) {
          // Supports "Label|Value" format: button shows Label, but sends Value to intent matcher
          const opts = qnaMatch.options.split(',').map((o: string) => o.trim()).filter(Boolean);
          if (opts.length > 0) {
            aiReplyRaw += `<div class="flex flex-wrap gap-2 mt-3">` + opts.map((o: string) => {
              const pipeIdx = o.indexOf('|');
              const label = pipeIdx !== -1 ? o.substring(0, pipeIdx).trim() : o;
              const value = pipeIdx !== -1 ? o.substring(pipeIdx + 1).trim() : o;
              return `<button class="px-3 py-1.5 text-xs font-medium text-brand bg-brand-bg hover:bg-brand-bg border border-brand/30 rounded-full transition-colors" onclick="window.postMessage({type: 'widget_quick_reply', text: '${value}'}, '*')">${label}</button>`;
            }).join('') + `</div>`;
          }
        }
      } else {
        aiReplyRaw = flowConfig?.defaultResponse || 'Maaf, saya belum mengerti pesan Anda. Apakah Anda ingin berbicara dengan agen kami? [HANDOFF_REQUESTED]';
      }
    }

    // Step 4: Parse AI response for handoff flag, classification, and data extraction
    const { cleanReply: parsedExtraction, extractedData } = parseDataExtractionTag(aiReplyRaw);
    const { cleanReply: parsedClassification, classification } = parseClassificationTag(parsedExtraction);
    const { cleanReply, handoffRequested } = parseAIResponseForHandoff(parsedClassification);

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
      // Update session status
      await prisma.chatSession.update({
        where: { id: currentSessionId },
        data: { status: 'queue' },
      });
      handoffOccurred = true;

      // Notify agent dashboard
      // Supabase Realtime handles this automatically.
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

    return corsResponse({
      sessionId: currentSessionId,
      status: handoffOccurred ? 'queue' : 'bot',
      reply: cleanReply,
      handoffOccurred,
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
