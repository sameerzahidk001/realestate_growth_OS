import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

const globalForPrisma = globalThis;

const getConnectionString = () => {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
  ].filter(Boolean);

  return candidates.find((u) => u.startsWith('postgresql://') || u.startsWith('postgres://')) || candidates[0];
};

const createPrismaClient = () => {
  const connectionString = getConnectionString();

  // Vercel: Neon HTTP adapter — pass connection STRING (not neon() function)
  if (connectionString && (process.env.VERCEL || process.env.USE_NEON_ADAPTER === '1')) {
    const adapter = new PrismaNeonHTTP(connectionString, {});
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
