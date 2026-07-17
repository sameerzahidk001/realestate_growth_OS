import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';

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

const getSql = () => neon(pickDbUrl());

const parsePath = (url = '') => {
  const [pathname, search = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(search));
  return { pathname, query };
};

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    builderId: row.builderId,
    isActive: row.isActive,
    builder: row.builder_id
      ? { id: row.builder_id, _id: row.builder_id, name: row.builder_name, plan: row.builder_plan }
      : undefined,
  };
};

const authenticate = async (req) => {
  const token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;
  if (!token || !process.env.JWT_SECRET) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const sql = getSql();
  const rows = await sql`
    SELECT u.*, b.id as builder_id, b.name as builder_name, b.plan as builder_plan
    FROM "User" u
    LEFT JOIN "Builder" b ON b.id = u."builderId"
    WHERE u.id = ${decoded.id}
    LIMIT 1
  `;
  const user = mapUser(rows[0]);
  return user?.isActive ? user : null;
};

const adaptRes = (res, jsonFn) => {
  let statusCode = 200;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonFn(res, statusCode, data);
    },
  };
};

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const matchRoute = (pathname) => {
  const clean = pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';

  if (clean === '/auth/me') return { name: 'authMe' };
  if (clean === '/users') return { name: 'users' };
  if (clean === '/leads') return { name: 'leads' };
  if (clean === '/leads/pipeline') return { name: 'pipeline' };
  if (/^\/leads\/[^/]+\/status$/.test(clean)) return { name: 'leadStatus', id: clean.split('/')[2] };
  if (/^\/leads\/[^/]+\/notes$/.test(clean)) return { name: 'leadNotes', id: clean.split('/')[2] };
  if (/^\/leads\/[^/]+$/.test(clean)) return { name: 'leadById', id: clean.split('/')[2] };

  return null;
};

export const handlePhase1Direct = async (req, res, path, jsonFn) => {
  const method = (req.method || 'GET').toUpperCase();
  const { pathname, query } = parsePath(path);
  const route = matchRoute(pathname);
  if (!route) return false;

  const publicRoutes = new Set([]);
  if (!publicRoutes.has(route.name)) {
    try {
      const user = await authenticate(req);
      if (!user) {
        jsonFn(res, 401, { message: 'Not authorized' });
        return true;
      }
      req.user = user;
    } catch {
      jsonFn(res, 401, { message: 'Not authorized' });
      return true;
    }
  }

  const body = method === 'GET' || method === 'HEAD' ? {} : await readBody(req);
  const expressReq = {
    method,
    headers: req.headers,
    query,
    params: route.id ? { id: route.id } : {},
    body,
    user: req.user,
  };
  const expressRes = adaptRes(res, jsonFn);

  if (route.name === 'authMe' && method === 'GET') {
    jsonFn(res, 200, req.user);
    return true;
  }

  if (route.name === 'users' && method === 'GET') {
    const { getUsers } = await import('../server/src/controllers/userController.js');
    await getUsers(expressReq, expressRes);
    return true;
  }

  const leadActions = {
    leads: { GET: 'getLeads', POST: 'createLead' },
    pipeline: { GET: 'getPipeline' },
    leadById: { GET: 'getLead', PUT: 'updateLead' },
    leadStatus: { PATCH: 'updateLeadStatus' },
    leadNotes: { POST: 'addLeadNote' },
  };

  const actionMap = leadActions[route.name];
  const actionName = actionMap?.[method];
  if (!actionName) return false;

  const controller = await import('../server/src/controllers/leadController.js');
  await controller[actionName](expressReq, expressRes);
  return true;
};
