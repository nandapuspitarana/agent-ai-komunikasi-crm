import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const flows = await prisma.flow.findMany({
    include: { _count: { select: { intents: true } } }
  });
  console.log('Flows:', JSON.stringify(flows, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());