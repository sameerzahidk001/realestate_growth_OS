import serverless from 'serverless-http';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { handlePhase1Direct, isPhase1Path } from './directPhase1.js';

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

const getSql = () => {
  const url = pickDbUrl();
  if (!url) throw new Error('DATABASE_URL missing');
  return neon(url);
};

const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const handleAuthDirect = async (req, res, path) => {
  const method = (req.method || 'GET').toUpperCase();

  if (path.endsWith('/auth/login') && method === 'POST') {
    const body = await readBody(req);
    const { email, password } = body;
    if (!process.env.JWT_SECRET) {
      return json(res, 500, { message: 'JWT_SECRET missing on Vercel' });
    }
    const sql = getSql();
    const rows = await sql`
      SELECT u.*, b.id as builder_id, b.name as builder_name, b.plan as builder_plan
      FROM "User" u
      LEFT JOIN "Builder" b ON b.id = u."builderId"
      WHERE u.email = ${email}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return json(res, 401, { message: 'Invalid email or password. Try Create account.' });
    }
    await sql`UPDATE "User" SET "lastLogin" = ${new Date()}, "updatedAt" = ${new Date()} WHERE id = ${user.id}`;
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });
    return json(res, 200, {
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        builderId: user.builderId,
        builder: {
          id: user.builder_id,
          _id: user.builder_id,
          name: user.builder_name,
          plan: user.builder_plan,
        },
      },
    });
  }

  if (path.endsWith('/auth/register') && method === 'POST') {
    const body = await readBody(req);
    const { builderName, name, email, password, phone } = body;
    const sql = getSql();
    const existing = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`;
    if (existing.length) return json(res, 400, { message: 'Email already registered' });

    const builderId = cuid();
    const userId = cuid();
    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();

    await sql`
      INSERT INTO "Builder" (id, name, email, phone, plan, "isActive", timezone, currency, "createdAt", "updatedAt")
      VALUES (${builderId}, ${builderName}, ${email}, ${phone || null}, 'pilot', true, 'Asia/Kolkata', 'INR', ${now}, ${now})
    `;
    await sql`
      INSERT INTO "User" (id, name, email, password, phone, role, "builderId", "isActive", "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${hashed}, ${phone || null}, 'owner', ${builderId}, true, 0, 0, 0, ${now}, ${now})
    `;

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });
    return json(res, 201, {
      token,
      user: {
        id: userId,
        _id: userId,
        name,
        email,
        role: 'owner',
        builderId,
        builder: { id: builderId, _id: builderId, name: builderName, plan: 'pilot' },
      },
    });
  }

  return false;
};

const getHandler = async () => {
  if (handler && ready) return handler;
  const url = pickDbUrl();
  if (!url) throw new Error('DATABASE_URL missing');
  process.env.DATABASE_URL = url;
  process.env.VERCEL = process.env.VERCEL || '1';
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
    let dbPing = false;
    let dbError = null;
    let userCount = null;
    if (url) {
      try {
        const sql = neon(url);
        await sql`SELECT 1 as ok`;
        dbPing = true;
        const rows = await sql`SELECT COUNT(*)::int as c FROM "User"`;
        userCount = rows[0]?.c ?? 0;
      } catch (e) {
        dbError = e.message;
      }
    }
    return json(res, 200, {
      status: 'ok',
      version: '2.8.0',
      engine: 'postgresql-neon-http',
      dbConfigured: Boolean(url),
      dbPing,
      dbError,
      dbHost: url ? new URL(url).host : null,
      userCount,
      envKeys: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        JWT_SECRET: Boolean(process.env.JWT_SECRET),
        MONGODB_URI: Boolean(process.env.MONGODB_URI),
      },
    });
  }

  // Auth without loading Prisma/Express (avoids serverless hang)
  if (path.includes('/auth/login') || path.includes('/auth/register')) {
    try {
      const handled = await handleAuthDirect(req, res, path);
      if (handled !== false) return;
    } catch (error) {
      return json(res, 500, { message: error.message || 'Auth error' });
    }
  }

  // Phase 1 routes without loading Prisma/Express (avoids serverless hang)
  if (isPhase1Path(path)) {
    try {
      const handled = await handlePhase1Direct(req, res, path, json);
      if (handled) return;
    } catch (error) {
      console.error('Phase1 direct error:', error);
      return json(res, 500, { message: error.message || 'Request failed' });
    }
  }

  try {
    const fn = await getHandler();
    return fn(req, res);
  } catch (error) {
    return json(res, 500, {
      message: error.message || 'Server error',
      hint: 'Auth should work via /api/auth/login. Other routes may need Prisma fix.',
    });
  }
}
