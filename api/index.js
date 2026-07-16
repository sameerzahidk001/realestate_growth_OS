import serverless from 'serverless-http';
import { neon } from '@neondatabase/serverless';

let handler;
let ready = false;

const pickDbUrl = () => {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ].filter(Boolean);
  return candidates.find((u) => u.startsWith('postgresql://') || u.startsWith('postgres://')) || candidates[0];
};

const getHandler = async () => {
  if (handler && ready) return handler;

  const url = pickDbUrl();
  if (!url) {
    throw new Error(
      'DATABASE_URL missing. Vercel → Settings → Environment Variables me Neon DATABASE_URL check karo, then Redeploy.'
    );
  }
  process.env.DATABASE_URL = url;
  process.env.VERCEL = process.env.VERCEL || '1';

  const { connectDB } = await import('../server/src/config/db.js');
  await connectDB();

  const { default: app } = await import('../server/src/app.js');
  handler = serverless(app);
  ready = true;
  return handler;
};

export default async function apiHandler(req, res) {
  if (req.headers['x-forwarded-uri'] && (req.url === '/api' || req.url === '/api/')) {
    req.url = req.headers['x-forwarded-uri'];
  }

  const path = req.url || '';

  if (path.includes('health')) {
    const url = pickDbUrl();
    let dbPing = null;
    let dbError = null;
    if (url) {
      try {
        const sql = neon(url);
        await Promise.race([
          sql`SELECT 1 as ok`,
          new Promise((_, rej) => setTimeout(() => rej(new Error('ping timeout')), 8000)),
        ]);
        dbPing = true;
      } catch (e) {
        dbPing = false;
        dbError = e.message;
      }
    }

    let host = null;
    try {
      host = url ? new URL(url).host : null;
    } catch {
      host = 'invalid-url';
    }

    return res.status(200).json({
      status: 'ok',
      version: '2.2.0',
      engine: 'postgresql',
      dbConfigured: Boolean(url),
      dbPing,
      dbError,
      dbHost: host,
      envKeys: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
        POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
        JWT_SECRET: Boolean(process.env.JWT_SECRET),
        MONGODB_URI: Boolean(process.env.MONGODB_URI),
      },
      path,
    });
  }

  try {
    const fn = await getHandler();
    return fn(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      message: error.message || 'Server error',
      hint: 'Open /api/health and check dbPing/dbError/dbHost. Ensure Neon DATABASE_URL is postgresql://...',
    });
  }
}
