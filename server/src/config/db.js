import prisma from '../lib/prisma.js';

const resolveDatabaseUrl = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED;

  if (url && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }
  return url;
};

export const connectDB = async () => {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Neon connect ke baad Redeploy karo. Env me DATABASE_URL / POSTGRES_URL check karo.'
    );
  }

  // Prefer Neon Prisma/pooled URL on serverless
  if (process.env.VERCEL && process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }

  await prisma.$connect();
  // quick ping so we fail fast if URL is wrong
  await prisma.$queryRaw`SELECT 1`;
  console.log('PostgreSQL connected');
};
