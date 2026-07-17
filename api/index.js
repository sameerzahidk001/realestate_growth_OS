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

const DEMO_USERS = [
  { email: 'owner@skyline.com', name: 'Rajesh Kumar', role: 'owner' },
  { email: 'manager@skyline.com', name: 'Priya Sharma', role: 'sales_manager' },
  { email: 'amit@skyline.com', name: 'Amit Singh', role: 'sales_executive' },
];

const SUPER_ADMIN_EMAIL = 'superadmin@avrgrowthos.com';

const ensureSchema = async (sql) => {
  // Allow platform super_admin users without a company
  await sql`ALTER TABLE "User" ALTER COLUMN "builderId" DROP NOT NULL`.catch(() => {});
};

const ensureSuperAdmin = async (sql) => {
  await ensureSchema(sql);
  const hashed = await bcrypt.hash('password123', 12);
  const now = new Date();
  const existing = await sql`SELECT id FROM "User" WHERE lower(email) = ${SUPER_ADMIN_EMAIL} LIMIT 1`;
  if (existing.length) {
    await sql`
      UPDATE "User"
      SET password = ${hashed}, role = ${'super_admin'}, "builderId" = NULL, "isActive" = true, "updatedAt" = ${now}
      WHERE id = ${existing[0].id}
    `;
    return { email: SUPER_ADMIN_EMAIL, action: 'updated' };
  }
  const userId = cuid();
  await sql`
    INSERT INTO "User" (
      id, name, email, password, phone, role, "builderId", "isActive",
      "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt"
    )
    VALUES (
      ${userId}, ${'AVR Super Admin'}, ${SUPER_ADMIN_EMAIL}, ${hashed}, ${null}, ${'super_admin'},
      ${null}, true, 0, 0, 0, ${now}, ${now}
    )
  `;
  return { email: SUPER_ADMIN_EMAIL, action: 'created' };
};

const ensureDemoUsers = async (sql) => {
  await ensureSchema(sql);
  const hashed = await bcrypt.hash('password123', 12);
  const now = new Date();
  let builders = await sql`SELECT id, name FROM "Builder" ORDER BY "createdAt" ASC LIMIT 1`;
  let builderId = builders[0]?.id;
  let builderName = builders[0]?.name || 'Skyline Developers';

  if (!builderId) {
    builderId = cuid();
    await sql`
      INSERT INTO "Builder" (id, name, email, phone, plan, "isActive", timezone, currency, "createdAt", "updatedAt")
      VALUES (${builderId}, ${'Skyline Developers'}, ${'owner@skyline.com'}, ${'+91 9876543210'}, ${'pilot'}, true, ${'Asia/Kolkata'}, ${'INR'}, ${now}, ${now})
    `;
  }

  const ensured = [];
  for (const demo of DEMO_USERS) {
    const existing = await sql`SELECT id, email, role FROM "User" WHERE lower(email) = ${demo.email} LIMIT 1`;
    if (existing.length) {
      await sql`
        UPDATE "User"
        SET password = ${hashed}, "isActive" = true, role = ${demo.role}, "builderId" = ${builderId}, "updatedAt" = ${now}
        WHERE id = ${existing[0].id}
      `;
      ensured.push({ email: demo.email, role: demo.role, action: 'updated' });
    } else {
      const userId = cuid();
      await sql`
        INSERT INTO "User" (
          id, name, email, password, phone, role, "builderId", "isActive",
          "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt"
        )
        VALUES (
          ${userId}, ${demo.name}, ${demo.email}, ${hashed}, ${null}, ${demo.role},
          ${builderId}, true, 0, 0, 0, ${now}, ${now}
        )
      `;
      ensured.push({ email: demo.email, role: demo.role, action: 'created' });
    }
  }

  const superAdmin = await ensureSuperAdmin(sql);
  ensured.push({ ...superAdmin, role: 'super_admin' });

  return { builderId, builderName, ensured };
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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const enteredPassword = String(password || '');
    const isCompanyDemo = DEMO_USERS.some((d) => d.email === normalizedEmail) && enteredPassword === 'password123';
    const isSuperDemo = normalizedEmail === SUPER_ADMIN_EMAIL && enteredPassword === 'password123';
    const isDemoLogin = isCompanyDemo || isSuperDemo;

    // If demo credentials: ensure users exist with correct password first
    if (isDemoLogin) {
      if (isSuperDemo) {
        await ensureSuperAdmin(sql);
      } else {
        await ensureDemoUsers(sql);
      }
    }

    const rows = await sql`
      SELECT u.*, b.id as builder_id, b.name as builder_name, b.plan as builder_plan
      FROM "User" u
      LEFT JOIN "Builder" b ON b.id = u."builderId"
      WHERE lower(u.email) = ${normalizedEmail}
      LIMIT 1
    `;
    let user = rows[0];

    if (!user) {
      return json(res, 401, { message: 'Invalid email or password. Try Create account.' });
    }
    if (user.isActive === false) {
      return json(res, 401, { message: 'Account is deactivated. Use Reset demo password on login page.' });
    }

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(enteredPassword, user.password || '');
    } catch {
      passwordOk = false;
    }

    if (!passwordOk && isDemoLogin) {
      const hashed = await bcrypt.hash('password123', 12);
      await sql`
        UPDATE "User"
        SET password = ${hashed}, "isActive" = true, "updatedAt" = ${new Date()}
        WHERE id = ${user.id}
      `;
      passwordOk = true;
    }

    if (!passwordOk) {
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
        builderId: user.builderId || null,
        builder: user.builder_id
          ? {
              id: user.builder_id,
              _id: user.builder_id,
              name: user.builder_name,
              plan: user.builder_plan,
            }
          : null,
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

  // Reset / recreate known demo accounts
  if (path.endsWith('/auth/reset-demo') && method === 'POST') {
    const sql = getSql();
    const result = await ensureDemoUsers(sql);
    return json(res, 200, {
      message: 'Demo users ready. Super Admin: superadmin@avrgrowthos.com / password123 | Company: owner@skyline.com / password123',
      ...result,
      login: {
        superAdmin: 'superadmin@avrgrowthos.com / password123',
        companyOwner: 'owner@skyline.com / password123',
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
        await sql`ALTER TABLE "User" ALTER COLUMN "builderId" DROP NOT NULL`.catch(() => {});
        dbPing = true;
        const rows = await sql`SELECT COUNT(*)::int as c FROM "User"`;
        userCount = rows[0]?.c ?? 0;
      } catch (e) {
        dbError = e.message;
      }
    }
    return json(res, 200, {
      status: 'ok',
      version: '3.1.0',
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
  if (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/reset-demo')
  ) {
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
