const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const crmDocsCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_documents'
  `);
  console.log('public.crm_documents cols:', crmDocsCols);

  const crmChunksCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_document_chunks'
  `);
  console.log('public.crm_document_chunks cols:', crmChunksCols);

  const crmDocs = await prisma.$queryRawUnsafe(`
    SELECT id, filename, status, chunk_count, created_at
    FROM public.crm_documents
  `);
  console.log('Existing crm_documents:', crmDocs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
