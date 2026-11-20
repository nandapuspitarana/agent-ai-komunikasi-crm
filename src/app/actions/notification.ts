'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Server actions are public endpoints: only a logged-in user may ask, and only
// about sessions they are allowed to see.
export async function checkSessionTenant(sessionId: string) {
  try {
    const authSession = await auth();
    const user = authSession?.user;
    if (!user?.id || typeof sessionId !== 'string') return null;

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true }
    });
    if (!session) return null;
    if (user.role !== 'SUPER_ADMIN' && session.tenantId !== user.tenantId) return null;
    return session.tenantId;
  } catch (err) {
    return null;
  }
}
