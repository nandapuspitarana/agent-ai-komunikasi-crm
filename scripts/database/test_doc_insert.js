const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const res = await prisma.$queryRawUnsafe(`
    INSERT INTO public.documents (content, metadata, embedding)
    VALUES ('test content', '{"test": true}'::jsonb, NULL)
    RETURNING id;
  `);
  console.log('Inserted:', res);
  const del = await prisma.$queryRawUnsafe(`
    DELETE FROM public.documents WHERE id = ${res[0].id};
  `);
  console.log('Deleted:', del);
}

test().catch(console.error).finally(() => prisma.$disconnect());
