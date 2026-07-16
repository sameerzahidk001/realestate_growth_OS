import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

const globalForPrisma = globalThis;

const getConnectionString = () => {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ].filter(Boolean);

  // Prefer postgresql:// (skip prisma+postgres accelerate URLs for adapter)
  const pg = candidates.find((u) => u.startsWith('postgresql://') || u.startsWith('postgres://'));
  return pg || candidates[0];
};

const createPrismaClient = () => {
  const connectionString = getConnectionString();

  if (connectionString && (process.env.VERCEL || process.env.USE_NEON_ADAPTER === '1')) {
    // Fetch-based pooling is more reliable on Vercel than raw WebSockets
    neonConfig.webSocketConstructor = ws;
    neonConfig.poolQueryViaFetch = true;

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
