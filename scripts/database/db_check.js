const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({ include: { activeFlow: true } });
  console.log('Tenants:', tenants.map(t => ({ id: t.id, activeFlowId: t.activeFlowId })));
  const sessions = await prisma.chatSession.findMany({
    include: { messages: true }
  });
  console.log('\nChat Sessions:', JSON.stringify(sessions, null, 2));
}
main().finally(() => prisma.$disconnect());
