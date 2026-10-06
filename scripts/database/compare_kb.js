const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const crmDocs = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM public.crm_documents`);
  const crmChunks = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM public.crm_document_chunks`);
  const publicDocs = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM public.documents`);
  const prismaKbDocs = await prisma.knowledgeDocument.count();

  console.log({
    'public.crm_documents': Number(crmDocs[0].count),
    'public.crm_document_chunks': Number(crmChunks[0].count),
    'public.documents': Number(publicDocs[0].count),
    'crm.crm_agent_KnowledgeDocument (Prisma)': prismaKbDocs,
  });

  const sampleCrmDoc = await prisma.$queryRawUnsafe(`
    SELECT * FROM public.crm_documents LIMIT 1
  `);
  console.log('Sample public.crm_documents row:', sampleCrmDoc[0]);

  const sampleChunk = await prisma.$queryRawUnsafe(`
    SELECT id, document_id, chunk_index, length(content) as content_len, length(embedding::text) as emb_len, metadata
    FROM public.crm_document_chunks LIMIT 1
  `);
  console.log('Sample public.crm_document_chunks row:', sampleChunk[0]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
