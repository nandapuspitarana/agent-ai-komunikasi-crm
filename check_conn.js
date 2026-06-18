require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

async function checkConnections() {
  console.log("Memeriksa konfigurasi koneksi...");
  console.log("DB_URL:", process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'));
  console.log("REDIS_URL:", process.env.REDIS_URL);
  console.log("REDIS_PREFIX:", process.env.REDIS_PREFIX);

  console.log("\n1. Menguji PostgreSQL (Prisma)...");
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL Terhubung!");
    
    // Test simple query to check schema access
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ PostgreSQL Query OK!");
  } catch (e) {
    console.log("❌ PostgreSQL Gagal:", e.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n2. Menguji Redis...");
  const redis = new Redis(process.env.REDIS_URL, {
    keyPrefix: process.env.REDIS_PREFIX || 'crm_agent:',
    maxRetriesPerRequest: 1
  });
  
  try {
    const res = await redis.ping();
    if (res === 'PONG') {
      console.log("✅ Redis Terhubung (PONG)!");
    } else {
      console.log("⚠️ Redis memberikan respons aneh:", res);
    }
  } catch (e) {
    console.log("❌ Redis Gagal:", e.message);
  } finally {
    redis.quit();
  }
}

checkConnections();
