const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT relrowsecurity FROM pg_class WHERE relname = 'crm_agent_Message';`);
    console.log('RLS Enabled:', res);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
