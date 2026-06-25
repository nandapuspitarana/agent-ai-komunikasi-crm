import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const flows = await prisma.flow.findMany({
    where: { tenantId: 'default-tenant' }
  });
  if (flows.length > 0) {
    const updated = await prisma.tenant.update({
      where: { id: 'default-tenant' },
      data: { activeFlowId: flows[1]?.id || flows[0].id }
    });
    console.log('Updated tenant with active flow:', updated.activeFlowId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());