import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  keyPrefix: process.env.REDIS_PREFIX || 'crm_agent:',
});

export async function setSession(sessionId: string, data: any, ttlSeconds: number = 3600) {
  await redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}

export default redis;
