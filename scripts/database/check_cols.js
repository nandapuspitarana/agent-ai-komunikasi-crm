const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chunks = await prisma.$queryRawUnsafe(`
    SELECT chunk_index, substring(content, 1, 200) as content_preview, length(content) as len
    FROM public.crm_document_chunks
    WHERE metadata->>'filename' LIKE '%Centres%'
    ORDER BY chunk_index
    LIMIT 3
  `);
  console.log('Centres chunks:', chunks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
