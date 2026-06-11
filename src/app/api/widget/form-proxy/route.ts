import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { url, payload, sessionId, tenantId } = await req.json();

    if (!url || !payload) {
      return NextResponse.json({ error: 'Missing url or payload' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Save form submission to DB if sessionId is provided
      if (sessionId) {
        const formSummary = Object.entries(payload)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n');
        const content = `📝 [Form Submitted]\n${formSummary}`;

        const savedMsg = await prisma.message.create({
          data: {
            sessionId,
            senderType: 'user',
            content
          }
        });

        // Broadcast to inbox
        const io = (global as any).socketIO;
        if (io && tenantId) {
          io.to(`inbox:${tenantId}`).emit('widget_message', {
            sessionId,
            message: content,
            timestamp: savedMsg.createdAt,
            source: 'widget'
          });
          io.to(`session:${sessionId}`).emit('user_message', {
            sessionId,
            message: content,
            senderType: 'user',
            timestamp: savedMsg.createdAt.toISOString()
          });
        }
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to submit to webhook' }, { status: response.status });
    }
  } catch (error) {
    console.error('[Form Proxy API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
