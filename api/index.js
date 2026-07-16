import serverless from 'serverless-http';

let handler;
let ready = false;

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

const getHandler = async () => {
  if (handler && ready) return handler;

  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      'DATABASE_URL missing. Vercel → Settings → Environment Variables me Neon DATABASE_URL check karo, then Redeploy.'
    );
  }

  // Prefer Neon pooled URL for serverless
  if (process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }

  const { connectDB } = await import('../server/src/config/db.js');
  await connectDB();

  const { default: app } = await import('../server/src/app.js');
  handler = serverless(app);
  ready = true;
  return handler;
};

export default async function apiHandler(req, res) {
  // Fast health check — no DB required (proves new deploy is live)
  const path = req.url || '';
  if (path === '/api/health' || path === '/health' || path.endsWith('/health')) {
    return res.status(200).json({
      status: 'ok',
      db: Boolean(
        process.env.DATABASE_URL ||
          process.env.POSTGRES_URL ||
          process.env.POSTGRES_PRISMA_URL
      ),
      engine: 'postgresql',
      version: '2.0.0',
    });
  }

  try {
    const fn = await getHandler();
    return fn(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      message: error.message || 'Server error',
      hint: 'Vercel env: DATABASE_URL (Neon), JWT_SECRET. Delete MONGODB_URI. Redeploy after changes.',
    });
  }
}
