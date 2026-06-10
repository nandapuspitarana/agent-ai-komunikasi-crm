import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/ai-agent';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    if (matchedIntent) {
      let finalReply = matchedIntent.response;
      const config: any = flow.config || {};
      
      // Use LLM to paraphrase the hardcoded response for a more natural conversational feel
      // IMPORTANT: Skip paraphrasing if the response contains HTML cards to prevent breaking the UI layout
      const hasHtml = matchedIntent.response.includes('<div');
      
      if (!hasHtml && config.llmProvider === 'gemini' && process.env.GOOGLE_API_KEY) {
        try {
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          const prompt = `You are ${config.name || 'an AI assistant'}. ${config.systemPrompt || ''}
User message: "${message}"
Pre-defined answer: "${matchedIntent.response}"

Please rewrite the pre-defined answer so it sounds natural, conversational, and directly responds to the user's specific message. 
CRITICAL RULES:
1. Do NOT change the core meaning, prices, or facts of the pre-defined answer.
2. If the pre-defined answer asks a question (like "Which city?"), you MUST also ask that EXACT same question at the end.
3. Keep it concise and professional.
4. Language: ${config.language || 'id'}.`;

          const result = await model.generateContent(prompt);
          if (result.response.text()) {
            finalReply = result.response.text();
          }
        } catch (e) {
          console.error('[Intent Paraphrase Error]', e);
        }
      }

      return NextResponse.json({
        reply: finalReply,
        intent: matchedIntent.name,
        type: matchedIntent.type,
        options: matchedIntent.options,
        sources: []
      });
    }

    // 2. Fallback to LLM
    const config: any = flow.config || {};
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
    const humanPrompt = config.humanPrompt || 'User says: {input}';
    
    // Format message with humanPrompt template
    const formattedMessage = humanPrompt.replace('{input}', message);

    try {
      const aiResponse = await chatWithAgent({
        message: formattedMessage,
        session_id: sessionId || crypto.randomUUID(),
        tenant_id: flow.tenantId,
        system_prompt: systemPrompt,
      });

      return NextResponse.json({
        reply: aiResponse.reply,
        intent: aiResponse.intent,
        sources: aiResponse.sources
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
