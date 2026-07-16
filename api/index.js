import serverless from 'serverless-http';
import { neon } from '@neondatabase/serverless';

let handler;
let ready = false;

const pickDbUrl = () => {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
  ].filter(Boolean);
  return candidates.find((u) => u.startsWith('postgresql://') || u.startsWith('postgres://')) || candidates[0];
};

const getHandler = async () => {
  if (handler && ready) return handler;

  const url = pickDbUrl();
  if (!url) {
    throw new Error('DATABASE_URL missing. Add Neon postgresql:// URL in Vercel env, then Redeploy.');
  }
  process.env.DATABASE_URL = url;
  process.env.VERCEL = process.env.VERCEL || '1';

  // Ensure tables exist (idempotent)
  try {
    const { execSync } = await import('child_process');
    // Skip prisma push at runtime — too slow. Tables should exist from build.
  } catch {
    /* ignore */
  }

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
    let userCount = null;
    if (url) {
      try {
        const sql = neon(url);
        await sql`SELECT 1 as ok`;
        dbPing = true;
        try {
          const rows = await sql`SELECT COUNT(*)::int as c FROM "User"`;
          userCount = rows[0]?.c ?? 0;
        } catch {
          userCount = 'no-tables';
        }
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
      version: '2.4.0',
      engine: 'postgresql-neon-http',
      dbConfigured: Boolean(url),
      dbPing,
      dbError,
      dbHost: host,
      userCount,
      envKeys: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
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
      hint: 'Open /api/health — check dbPing and userCount. Use Create account if userCount is 0.',
    });
  }
}
