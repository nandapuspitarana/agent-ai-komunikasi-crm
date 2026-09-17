const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Mengaktifkan Supabase Realtime untuk tabel crm_agent_Message dan crm_agent_ChatSession...');
    
    // 1. Buat publication 'supabase_realtime' jika belum ada
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
        END IF;
      END $$;
    `);
    
    // 2. Tambahkan tabel ke publication
    try {
      await prisma.$executeRawUnsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE "crm"."crm_agent_Message";`);
    } catch (e) {
      if (!e.message.includes('already exists')) console.error('Tabel Message gagal:', e.message);
    }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE "crm"."crm_agent_ChatSession";`);
    } catch (e) {
      if (!e.message.includes('already exists')) console.error('Tabel ChatSession gagal:', e.message);
    }
    
    // 3. Set Replica Identity
    await prisma.$executeRawUnsafe(`ALTER TABLE "crm"."crm_agent_Message" REPLICA IDENTITY FULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "crm"."crm_agent_ChatSession" REPLICA IDENTITY FULL;`);
    
    console.log('Sukses mengaktifkan Realtime!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
