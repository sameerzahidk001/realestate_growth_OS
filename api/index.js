import serverless from 'serverless-http';

let handler;
let ready = false;

const getHandler = async () => {
  if (handler && ready) return handler;

  const url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      'DATABASE_URL missing. Vercel → Settings → Environment Variables me Neon DATABASE_URL check karo, then Redeploy.'
    );
  }
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url;
  process.env.VERCEL = process.env.VERCEL || '1';

  const { connectDB } = await import('../server/src/config/db.js');
  await connectDB();

  const { default: app } = await import('../server/src/app.js');
  handler = serverless(app);
  ready = true;
  return handler;
};

export default async function apiHandler(req, res) {
  // Normalize path: some rewrites leave only /api
  const incoming = req.url || '/';
  if (req.headers['x-forwarded-uri'] && (incoming === '/api' || incoming === '/api/')) {
    req.url = req.headers['x-forwarded-uri'];
  }

  const path = req.url || '';
  if (path === '/api/health' || path === '/health' || path.endsWith('/health')) {
    return res.status(200).json({
      status: 'ok',
      dbConfigured: Boolean(
        process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
      ),
      engine: 'postgresql',
      version: '2.1.0',
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
      hint: 'Vercel env: DATABASE_URL (Neon), JWT_SECRET. Delete MONGODB_URI. Redeploy after changes.',
    });
  }
}
