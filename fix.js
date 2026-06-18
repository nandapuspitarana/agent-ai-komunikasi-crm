const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$executeRawUnsafe('ALTER TABLE "crm_agent_prisma_migrations" RENAME TO "_prisma_migrations"')
  .then(() => { console.log('Fixed migrations table'); prisma.$disconnect(); })
  .catch((e) => { console.log(e); prisma.$disconnect(); });
