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

const authorize = (user, roles) => roles.includes(user.role);

// Order matters: more specific routes first
const ROUTES = [
  { match: /^\/dashboard\/reports\/source$/, methods: { GET: ['dashboard', 'getLeadSourceReport'] } },
  { match: /^\/dashboard\/reports\/funnel$/, methods: { GET: ['dashboard', 'getFunnelReport'] } },
  { match: /^\/dashboard\/reports\/executive$/, methods: { GET: ['dashboard', 'getExecutiveReport'] } },
  { match: /^\/dashboard$/, methods: { GET: ['dashboard', 'getDashboard'] } },

  { match: /^\/follow-ups\/due$/, methods: { GET: ['followUp', 'getDueFollowUps'] } },
  { match: /^\/follow-ups\/([^/]+)\/complete$/, methods: { PATCH: ['followUp', 'completeFollowUp'], params: ['id'] } },
  { match: /^\/follow-ups\/([^/]+)$/, methods: { PUT: ['followUp', 'updateFollowUp'], DELETE: ['followUp', 'deleteFollowUp'], params: ['id'] } },
  { match: /^\/follow-ups$/, methods: { GET: ['followUp', 'getFollowUps'], POST: ['followUp', 'createFollowUp'] } },

  { match: /^\/site-visits\/([^/]+)$/, methods: { PUT: ['siteVisit', 'updateSiteVisit'], DELETE: ['siteVisit', 'deleteSiteVisit'], params: ['id'] } },
  { match: /^\/site-visits$/, methods: { GET: ['siteVisit', 'getSiteVisits'], POST: ['siteVisit', 'createSiteVisit'] } },

  { match: /^\/projects\/units\/([^/]+)\/link$/, methods: { PATCH: ['project', 'linkUnitToLead'], params: ['id'] } },
  { match: /^\/projects\/units\/([^/]+)$/, methods: { PUT: ['project', 'updateUnit'], DELETE: ['project', 'deleteUnit'], params: ['id'] } },
  { match: /^\/projects\/([^/]+)\/units$/, methods: { GET: ['project', 'getUnits'], POST: ['project', 'createUnit'], params: ['projectId'] } },
  { match: /^\/projects\/([^/]+)$/, methods: { GET: ['project', 'getProject'], PUT: ['project', 'updateProject'], DELETE: ['project', 'deleteProject'], params: ['id'] } },
  { match: /^\/projects$/, methods: { GET: ['project', 'getProjects'], POST: ['project', 'createProject'] } },

  { match: /^\/users\/([^/]+)$/, methods: { PUT: ['user', 'updateUser'], DELETE: ['user', 'deleteUser'], params: ['id'] }, roles: ['owner', 'sales_manager'] },
  { match: /^\/users$/, methods: { GET: ['user', 'getUsers'], POST: ['user', 'createUser'] }, roles: ['owner', 'sales_manager'] },

  { match: /^\/auth\/me$/, methods: { GET: ['auth', 'getMe'] } },

  { match: /^\/leads\/pipeline$/, methods: { GET: ['lead', 'getPipeline'] } },
  { match: /^\/leads\/([^/]+)\/status$/, methods: { PATCH: ['lead', 'updateLeadStatus'], params: ['id'] } },
  { match: /^\/leads\/([^/]+)\/notes$/, methods: { POST: ['lead', 'addLeadNote'], params: ['id'] } },
  { match: /^\/leads\/([^/]+)$/, methods: { GET: ['lead', 'getLead'], PUT: ['lead', 'updateLead'], DELETE: ['lead', 'deleteLead'], params: ['id'] } },
  { match: /^\/leads$/, methods: { GET: ['lead', 'getLeads'], POST: ['lead', 'createLead'] } },
];

const CONTROLLERS = {
  dashboard: () => import('../server/src/controllers/dashboardController.js'),
  followUp: () => import('../server/src/controllers/followUpController.js'),
  siteVisit: () => import('../server/src/controllers/siteVisitController.js'),
  project: () => import('../server/src/controllers/projectController.js'),
  user: () => import('../server/src/controllers/userController.js'),
  lead: () => import('../server/src/controllers/leadController.js'),
};

const matchRoute = (pathname) => {
  const clean = pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';

  for (const route of ROUTES) {
    const m = clean.match(route.match);
    if (!m) continue;

    const params = {};
    route.params?.forEach((name, i) => {
      params[name] = m[i + 1];
    });

    return { ...route, params };
  }
  return null;
};

export const handlePhase1Direct = async (req, res, path, jsonFn) => {
  const method = (req.method || 'GET').toUpperCase();
  const { pathname, query } = parsePath(path);
  const route = matchRoute(pathname);
  if (!route) return false;

  const handlerKey = route.methods[method];
  if (!handlerKey) return false;

  const [controllerName, actionName] = handlerKey;

  try {
    const user = await authenticate(req);
    if (!user) {
      jsonFn(res, 401, { message: 'Not authorized' });
      return true;
    }

    if (route.roles && !authorize(user, route.roles)) {
      jsonFn(res, 403, { message: 'Access denied for this role' });
      return true;
    }

    req.user = user;

    if (controllerName === 'auth' && actionName === 'getMe') {
      jsonFn(res, 200, user);
      return true;
    }

    const body = method === 'GET' || method === 'HEAD' ? {} : await readBody(req);
    const expressReq = {
      method,
      headers: req.headers,
      query,
      params: route.params || {},
      body,
      user,
    };
    const expressRes = adaptRes(res, jsonFn);

    const controller = await CONTROLLERS[controllerName]();
    await controller[actionName](expressReq, expressRes);
    return true;
  } catch (error) {
    console.error(`Direct route error [${method} ${pathname}]:`, error);
    jsonFn(res, 500, { message: error.message || 'Request failed' });
    return true;
  }
};

export const isPhase1Path = (path) => {
  const { pathname } = parsePath(path);
  const clean = pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const prefixes = [
    '/auth/me',
    '/users',
    '/leads',
    '/dashboard',
    '/follow-ups',
    '/site-visits',
    '/projects',
  ];
  return prefixes.some((p) => clean === p || clean.startsWith(`${p}/`));
};
