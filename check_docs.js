const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocs() {
  const docs = await prisma.knowledgeDocument.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(docs.map(d => ({
    metaName: d.metaName,
    status: d.status,
    errorMsg: d.errorMsg
  })));
}

checkDocs().catch(console.error).finally(() => prisma.$disconnect());
