'use server';

import { prisma } from '@/lib/prisma';

export async function checkSessionTenant(sessionId: string) {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true }
    });
    return session?.tenantId || null;
  } catch (err) {
    return null;
  }
}
