const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameTables() {
  console.log("Terhubung ke PostgreSQL menggunakan Prisma. Memulai proses RENAME tabel...");

  const tablesToRename = [
    'User',
    'AuditLog',
    'PasswordResetToken',
    'Tenant',
    'Integration',
    'Flow',
    'Intent',
    'ChatSession',
    'Message',
    'KnowledgeDocument',
    'Asset'
  ];

  try {
    for (const table of tablesToRename) {
      const oldName = `"${table}"`;
      const newName = `"crm_agent_${table}"`;

      try {
        // Cek apakah tabel ada
        const res = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${table}'
          );
        `);
        
        if (res[0] && res[0].exists) {
          await prisma.$executeRawUnsafe(`ALTER TABLE ${oldName} RENAME TO ${newName};`);
          console.log(`✅ Berhasil: Tabel ${oldName} diubah menjadi ${newName}`);
        } else {
          console.log(`⚠️ Lewati: Tabel ${oldName} tidak ditemukan (mungkin sudah direname).`);
        }
      } catch (err) {
        console.error(`❌ Gagal mengubah tabel ${oldName}:`, err.message);
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "_prisma_migrations" RENAME TO "crm_agent_prisma_migrations";`);
      console.log(`✅ Berhasil merename _prisma_migrations`);
    } catch(e) {}

    console.log("\nProses selesai! Semua data dipertahankan. Sekarang Anda bisa menjalankan: npx prisma generate && npx prisma db push");
  } finally {
    await prisma.$disconnect();
  }
}

renameTables();
