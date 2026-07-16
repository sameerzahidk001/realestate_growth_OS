import prisma from '../lib/prisma.js';

export const connectDB = async () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Neon connect ke baad Redeploy karo. Env me DATABASE_URL / POSTGRES_URL check karo.'
    );
  }

  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url;

  // Neon HTTP adapter: skip $connect(), just run a cheap query
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout (10s). Check Neon DATABASE_URL on Vercel.')), 10000)
    ),
  ]);

  console.log('PostgreSQL connected (Neon HTTP)');
};
