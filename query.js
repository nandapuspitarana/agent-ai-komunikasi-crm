const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: '4dd9d2ab-2fcc-4136-8029-50f251494756' },
    include: { activeFlow: true }
  });
  console.log(JSON.stringify(tenant, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
