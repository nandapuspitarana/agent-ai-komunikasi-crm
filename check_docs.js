const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocs() {
  const docs = await prisma.knowledgeDocument.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(docs.map(d => ({
    id: d.id,
    tenantId: d.tenantId,
    metaName: d.metaName,
    status: d.status,
    proxyDocId: d.proxyDocId,
    errorMsg: d.errorMsg
  })));
}

checkDocs().catch(console.error).finally(() => prisma.$disconnect());
