import prisma from '../lib/prisma.js';

export const connectDB = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add PostgreSQL URL in Vercel Environment Variables (Neon/Supabase).');
  }
  await prisma.$connect();
  console.log('PostgreSQL connected');
};
