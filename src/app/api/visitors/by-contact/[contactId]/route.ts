import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> | { contactId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const resolvedParams = await params;
    const contactId = resolvedParams.contactId;

    const visitor = await prisma.visitorProfile.findUnique({
      where: { tenantId_contactId: { tenantId, contactId } }
    });

    if (!visitor) {
      return NextResponse.json({ visitor: null });
    }

    return NextResponse.json({ visitor });
  } catch (error: any) {
    console.error('Error in GET /api/visitors/by-contact/[contactId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
