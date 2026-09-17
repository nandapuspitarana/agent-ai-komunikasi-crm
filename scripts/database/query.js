const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, tenantId: true } });
  console.log("USERS:", users);
  
  const docs = await prisma.knowledgeDocument.findMany({ select: { id: true, tenantId: true, metaName: true, proxyDocId: true, status: true } });
  console.log("DOCS:", docs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
