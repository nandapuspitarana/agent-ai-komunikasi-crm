const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({ include: { activeFlow: true } });
  console.log('Tenants:', tenants.map(t => ({ id: t.id, activeFlowId: t.activeFlowId })));
  const docs = await prisma.knowledgeDocument.findMany({
    select: { id: true, filename: true, status: true, proxyDocId: true, flowId: true }
  });
  console.log('\nDocuments:', docs);
}
main().finally(() => prisma.$disconnect());
