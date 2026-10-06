const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
  `);
  console.log('public.documents columns:', cols);

  const sample = await prisma.$queryRawUnsafe(`
    SELECT id, metadata, substring(content, 1, 100) as content_preview
    FROM public.documents
    LIMIT 3
  `);
  console.log('Sample docs:', sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
