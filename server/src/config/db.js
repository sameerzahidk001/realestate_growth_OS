import prisma from '../lib/prisma.js';

export const connectDB = async () => {
  const url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Neon connect ke baad Redeploy karo. Env me DATABASE_URL / POSTGRES_URL check karo.'
    );
  }

  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url;

  await Promise.race([
    (async () => {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connect timeout (15s). Check Neon DATABASE_URL on Vercel.')), 15000)
    ),
  ]);

  console.log('PostgreSQL connected');
};
