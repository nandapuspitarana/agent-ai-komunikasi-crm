import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/ai-agent';

import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let { flowId, message, sessionId, matchedIntent } = await req.json();

    if (!flowId || !message) {
      return NextResponse.json({ error: 'Missing flowId or message' }, { status: 400 });
    }

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { intents: true }
    });

    if (!flow) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 1. Native Intent Matching (Rule-based Fallback if not provided by client)
    if (!matchedIntent && flow.intents && flow.intents.length > 0) {
      const lowerMsg = message.toLowerCase().trim();
      let bestMatch = null;
      let maxMatchLength = 0;
      
      for (const intent of flow.intents) {
        if (!intent.trainingPhrases || !Array.isArray(intent.trainingPhrases)) continue;
        
        for (const phrase of intent.trainingPhrases) {
          const lowerPhrase = phrase.toLowerCase().trim();
          if (lowerMsg === lowerPhrase) {
            bestMatch = intent;
            maxMatchLength = Infinity;
            break;
          } else if (lowerMsg.includes(lowerPhrase)) {
            if (lowerPhrase.length > maxMatchLength) {
              maxMatchLength = lowerPhrase.length;
              bestMatch = intent;
            }
          }
        }
        if (maxMatchLength === Infinity) break;
      }
      
      if (bestMatch) {
        matchedIntent = {
          name: bestMatch.name,
          response: bestMatch.response,
          type: bestMatch.responseType,
          options: bestMatch.options
        };
      }
    }

    const config: any = flow.config || {};
    let systemPrompt = config.systemPrompt || 'You are a helpful assistant.';

    // Tell the LLM how to parse the UI pipe syntax if it reads it from RAG documents
    systemPrompt += `\n\n[IMPORTANT UI FORMATTING RULE]\nIf you read options or locations from your knowledge base that contain a pipe character (e.g. 'Bangkok|Bangkok Private Office'), DO NOT output the pipe or the value after it. ONLY output the friendly label before the pipe (e.g. 'Bangkok'). Never output 'Label|Value' in your response.`;

    let bypassLLM = false;
    let aiReplyRaw = '';

    // If there is a matched intent, append its response to the system prompt as a reference
    if (matchedIntent) {
      if (['form', 'options', 'card'].includes(matchedIntent.type)) {
        bypassLLM = true;
        aiReplyRaw = matchedIntent.response;
        if (matchedIntent.type === 'handoff' && !aiReplyRaw.includes('[HANDOFF_REQUESTED]')) {
          aiReplyRaw += ' [HANDOFF_REQUESTED]';
        }
      } else {
        // Auto-append handoff flag if response type is handoff
        let referenceResponse = matchedIntent.response;
        if (matchedIntent.type === 'handoff' && !referenceResponse.includes('[HANDOFF_REQUESTED]')) {
          referenceResponse += ' [HANDOFF_REQUESTED]';
        }

        systemPrompt += `\n\n[USER INTENT MATCHED]\nThe user's request matches the intent '${matchedIntent.name}'. Use the following pre-defined response as the core factual reference for your answer: "${referenceResponse}". Rewrite it to be conversational, natural, and directly address the user's message while maintaining the exact same facts, prices, and questions.`;
      }
    }

    const humanPrompt = config.humanPrompt || 'User says: {input}';
    const formattedMessage = humanPrompt.replace('{input}', message);

    try {
      let sources: any[] = [];
      let llmIntent = '';

      if (!bypassLLM) {
        const aiResponse = await chatWithAgent({
          message: formattedMessage,
          session_id: sessionId || crypto.randomUUID(),
          tenant_id: flow.tenantId,
          system_prompt: systemPrompt,
        });
        aiReplyRaw = aiResponse.reply;
        llmIntent = aiResponse.intent || '';
        sources = aiResponse.sources || [];
      }

      return NextResponse.json({
        reply: aiReplyRaw,
        intent: matchedIntent ? matchedIntent.name : llmIntent,
        type: matchedIntent ? matchedIntent.type : 'text',
        options: matchedIntent ? matchedIntent.options : '',
        sources: sources
      });
    } catch (aiError) {
      console.error('[Test Chat AI Error]', aiError);
      return NextResponse.json({ 
        reply: config.defaultResponse || 'Maaf, sistem AI sedang offline. Namun, jika Anda mengetik pertanyaan yang sesuai dengan FAQ/Intent, saya tetap bisa menjawabnya!', 
        intent: 'offline',
        type: config.defaultResponseType || 'text',
        options: config.defaultResponseOptions || ''
      });
    }

  } catch (error: any) {
    console.error('[Test Chat Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
