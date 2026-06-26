const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Granting anon permissions for schema crm...');
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA "crm" TO anon;`);
    await prisma.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA "crm" TO anon;`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA "crm" GRANT SELECT ON TABLES TO anon;`);
    console.log('Permissions granted successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
