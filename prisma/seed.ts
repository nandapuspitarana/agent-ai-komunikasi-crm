import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'ZetaCRM Demo',
      subscription: 'premium',
    },
  });

  console.log('Tenant created:', tenant.name);

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@zetacrm.com' },
    update: {},
    create: {
      email: 'admin@zetacrm.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      tenantId: null, // Super admin tidak terikat ke tenant tertentu
    },
  });

  console.log('Super Admin created:', superAdmin.email);

  // Create Agent
  const agent = await prisma.user.upsert({
    where: { email: 'agent@zetacrm.com' },
    update: {},
    create: {
      email: 'agent@zetacrm.com',
      password: hashedPassword,
      name: 'Customer Support Agent',
      role: UserRole.AGENT,
      tenantId: tenant.id,
    },
  });

  console.log('Agent created:', agent.email);

  // Create Business Partner
  const partner = await prisma.user.upsert({
    where: { email: 'partner@zetacrm.com' },
    update: {},
    create: {
      email: 'partner@zetacrm.com',
      password: hashedPassword,
      name: 'Business Partner',
      role: UserRole.BUSINESS_PARTNER,
      tenantId: tenant.id,
    },
  });

  console.log('Business Partner created:', partner.email);

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin:');
  console.log('  Email: admin@zetacrm.com');
  console.log('  Password: password123');
  console.log('  Role: SUPER_ADMIN');
  console.log('');
  console.log('Agent:');
  console.log('  Email: agent@zetacrm.com');
  console.log('  Password: password123');
  console.log('  Role: AGENT');
  console.log('');
  console.log('Business Partner:');
  console.log('  Email: partner@zetacrm.com');
  console.log('  Password: password123');
  console.log('  Role: BUSINESS_PARTNER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
