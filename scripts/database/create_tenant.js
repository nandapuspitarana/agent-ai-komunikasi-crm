const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = "968102a6-21b8-41dc-9f62-d7b088c9cb5f";
  
  console.log(`Checking if tenant ${tenantId} exists...`);
  
  const existing = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  
  if (existing) {
    console.log(`Tenant ${tenantId} already exists!`);
  } else {
    console.log(`Creating tenant ${tenantId}...`);
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "My New Business Tenant",
        aiEnabled: true,
      }
    });
    console.log(`Successfully created tenant ${tenantId}!`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
