const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestMessages = await prisma.message.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      session: {
        select: { id: true, tenantId: true, channel: true, status: true, contactId: true, assignedAgentId: true }
      }
    }
  });
  console.log("Latest 10 messages:", JSON.stringify(latestMessages, null, 2));

  const latestSessions = await prisma.chatSession.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, tenantId: true, channel: true, status: true, contactId: true, assignedAgentId: true, updatedAt: true }
  });
  console.log("Latest 5 sessions:", JSON.stringify(latestSessions, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
