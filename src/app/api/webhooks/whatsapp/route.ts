import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { redis } from '@/lib/redis-session';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * WhatsApp Cloud API Webhook Handler
 * Receives incoming messages from WhatsApp and routes them to the flow engine
 */

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'video' | 'audio';
  text?: { body: string };
  image?: { id: string; caption?: string };
  document?: { id: string; filename: string };
  video?: { id: string; caption?: string };
  audio?: { id: string };
}

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * GET handler for webhook verification
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the token
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verified successfully');
      return NextResponse.json(null, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('[WhatsApp Webhook] Verification failed');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  } catch (error) {
    console.error('[WhatsApp Webhook] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WhatsAppWebhookPayload;

    // Verify request signature
    const signature = request.headers.get('x-hub-signature-256');
    if (!verifySignature(await request.text(), signature || '')) {
      console.warn('[WhatsApp Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(body, null, 2));

    // Process webhook payload
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleIncomingMessages(change.value);
          } else if (change.field === 'message_status') {
            await handleMessageStatus(change.value);
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessages(payload: any) {
  try {
    if (!payload.messages || payload.messages.length === 0) {
      return;
    }

    const phoneNumberId = payload.metadata.phone_number_id;
    const contact = payload.contacts?.[0];
    const message = payload.messages[0] as WhatsAppMessage;

    if (!contact) {
      console.warn('[WhatsApp] No contact info in message');
      return;
    }

    const senderPhone = message.from;
    const senderName = contact.profile.name;
    const messageId = message.id;
    const messageTimestamp = message.timestamp;

    console.log(`[WhatsApp] Message from ${senderName} (${senderPhone}): ${message.type}`);

    // Find or create integration session
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'whatsapp',
        metadata: {
          path: ['phoneNumberId'],
          equals: phoneNumberId,
        },
      },
    });

    if (!integration) {
      console.warn(`[WhatsApp] No integration found for phone ${phoneNumberId}`);
      return;
    }

    // Find or create chat session for this contact
    let chatSession = await prisma.chatSession.findFirst({
      where: {
        tenantId: integration.tenantId,
        externalId: senderPhone,
        channel: 'whatsapp',
      },
    });

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          tenantId: integration.tenantId,
          externalId: senderPhone,
          channel: 'whatsapp',
          contactName: senderName,
          contactPhone: senderPhone,
          metadata: {
            phoneNumberId,
            messageId,
          },
        },
      });

      console.log(`[WhatsApp] Created new session: ${chatSession.id}`);
    }

    // Extract message content based on type
    let messageContent = '';
    let mediaUrl: string | null = null;

    switch (message.type) {
      case 'text':
        messageContent = message.text?.body || '';
        break;
      case 'image':
        messageContent = message.image?.caption || '[Image]';
        mediaUrl = message.image?.id || null;
        break;
      case 'document':
        messageContent = `[Document: ${message.document?.filename}]`;
        mediaUrl = message.document?.id || null;
        break;
      case 'video':
        messageContent = message.video?.caption || '[Video]';
        mediaUrl = message.video?.id || null;
        break;
      case 'audio':
        messageContent = '[Audio Message]';
        mediaUrl = message.audio?.id || null;
        break;
      default:
        messageContent = `[${message.type}]`;
    }

    // Save message to database
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        tenantId: integration.tenantId,
        sender: 'user',
        message: messageContent,
        externalId: messageId,
        metadata: {
          type: message.type,
          mediaUrl,
          timestamp: messageTimestamp,
        },
      },
    });

    console.log(`[WhatsApp] Saved message: ${chatMessage.id}`);

    // Emit to flow engine via Socket.io or queue
    await routeToFlowEngine({
      sessionId: chatSession.id,
      tenantId: integration.tenantId,
      message: messageContent,
      messageId,
      channel: 'whatsapp',
      sender: senderPhone,
      senderName,
      metadata: {
        type: message.type,
        mediaUrl,
        phoneNumberId,
      },
    });

    // Store in Redis for quick access
    const sessionKey = `whatsapp:session:${senderPhone}`;
    await redis.setex(
      sessionKey,
      86400, // 24 hours
      JSON.stringify({
        sessionId: chatSession.id,
        tenantId: integration.tenantId,
        lastMessage: messageContent,
        lastMessageTime: messageTimestamp,
      })
    );

  } catch (error) {
    console.error('[WhatsApp] Error handling incoming message:', error);
  }
}

/**
 * Handle WhatsApp message status updates
 */
async function handleMessageStatus(payload: any) {
  try {
    if (!payload.statuses || payload.statuses.length === 0) {
      return;
    }

    const status = payload.statuses[0];
    const messageId = status.id;
    const messageStatus = status.status;
    const recipientId = status.recipient_id;

    console.log(`[WhatsApp] Message ${messageId} status: ${messageStatus}`);

    // Update message status in database
    await prisma.chatMessage.updateMany({
      where: {
        externalId: messageId,
      },
      data: {
        metadata: {
          status: messageStatus,
          statusTimestamp: status.timestamp,
        },
      },
    });

  } catch (error) {
    console.error('[WhatsApp] Error handling message status:', error);
  }
}

/**
 * Route incoming message to flow engine
 */
async function routeToFlowEngine(payload: any) {
  try {
    // This would integrate with your flow engine
    // For now, we'll emit to Socket.io if available

    const io = (global as any).socketIO;
    if (io) {
      // Emit to agents connected to this tenant's inbox
      io.to(`inbox:${payload.tenantId}`).emit('whatsapp_message', {
        sessionId: payload.sessionId,
        message: payload.message,
        sender: payload.sender,
        senderName: payload.senderName,
        timestamp: new Date().toISOString(),
        metadata: payload.metadata,
      });

      console.log(`[WhatsApp] Routed message to inbox:${payload.tenantId}`);
    }

    // Also store in queue for asynchronous processing
    const queueKey = `whatsapp:queue:${payload.tenantId}`;
    await redis.lpush(
      queueKey,
      JSON.stringify(payload)
    );

  } catch (error) {
    console.error('[WhatsApp] Error routing to flow engine:', error);
  }
}

/**
 * Verify WhatsApp webhook signature
 */
function verifySignature(body: string, signature: string): boolean {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      console.warn('[WhatsApp] WHATSAPP_APP_SECRET not configured');
      return false;
    }

    // Extract signature hash
    const [algorithm, hash] = signature.split('=');

    if (algorithm !== 'sha256') {
      return false;
    }

    // Compute HMAC
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    return expectedHash === hash;
  } catch (error) {
    console.error('[WhatsApp] Error verifying signature:', error);
    return false;
  }
}

/**
 * Send message via WhatsApp (helper function)
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientPhone: string,
  message: string,
  accessToken: string
): Promise<any> {
  try {
    const url = `https://graph.instagram.com/v20.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${data.error?.message}`);
    }

    console.log(`[WhatsApp] Message sent to ${recipientPhone}`);
    return data;
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    throw error;
  }
}
