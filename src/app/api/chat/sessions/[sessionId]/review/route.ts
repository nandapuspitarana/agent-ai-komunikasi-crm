import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { rating, review } = body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 });
    }

    // Verify session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update rating & review
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        rating,
        review
      }
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
