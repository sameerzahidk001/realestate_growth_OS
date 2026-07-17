import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { hashPassword } from '../lib/password.js';
import { formatId } from '../utils/apiFormat.js';

const requireSuperAdmin = (req, res) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ message: 'Super admin access required' });
    return false;
  }
  return true;
};

const mapCompany = (row) =>
  formatId({
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    plan: row.plan,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userCount: Number(row.user_count || 0),
    leadCount: Number(row.lead_count || 0),
  });

export const getAdminStats = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();

    const [companies, users, leads, active] = await Promise.all([
      sql`SELECT COUNT(*)::int AS c FROM "Builder"`,
      sql`SELECT COUNT(*)::int AS c FROM "User" WHERE role <> 'super_admin'`,
      sql`SELECT COUNT(*)::int AS c FROM "Lead"`,
      sql`SELECT COUNT(*)::int AS c FROM "Builder" WHERE "isActive" = true`,
    ]);

    res.json({
      totalCompanies: companies[0]?.c || 0,
      activeCompanies: active[0]?.c || 0,
      totalUsers: users[0]?.c || 0,
      totalLeads: leads[0]?.c || 0,
    });
  } catch (err) {
    console.error('getAdminStats:', err);
    res.status(500).json({ message: err.message || 'Failed to load stats' });
  }
};

export const getCompanies = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();
    const search = req.query.search?.trim();

    const rows = await sql`
      SELECT
        b.*,
        (SELECT COUNT(*)::int FROM "User" u WHERE u."builderId" = b.id) AS user_count,
        (SELECT COUNT(*)::int FROM "Lead" l WHERE l."builderId" = b.id) AS lead_count
      FROM "Builder" b
      WHERE 1=1
      ${search ? sql`AND (b.name ILIKE ${'%' + search + '%'} OR b.email ILIKE ${'%' + search + '%'})` : sql``}
      ORDER BY b."createdAt" DESC
    `;

    res.json(rows.map(mapCompany));
  } catch (err) {
    console.error('getCompanies:', err);
    res.status(500).json({ message: err.message || 'Failed to load companies' });
  }
};

export const createCompany = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();
    const {
      name,
      email,
      phone,
      city,
      plan = 'pilot',
      ownerName,
      ownerEmail,
      ownerPassword = 'password123',
    } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Company name and email are required' });
    }
    if (!ownerName?.trim() || !ownerEmail?.trim()) {
      return res.status(400).json({ message: 'Owner name and email are required' });
    }

    const existingBuilder = await sql`SELECT id FROM "Builder" WHERE lower(email) = ${email.trim().toLowerCase()} LIMIT 1`;
    if (existingBuilder.length) return res.status(400).json({ message: 'Company email already exists' });

    const existingUser = await sql`SELECT id FROM "User" WHERE lower(email) = ${ownerEmail.trim().toLowerCase()} LIMIT 1`;
    if (existingUser.length) return res.status(400).json({ message: 'Owner email already exists' });

    const builderId = cuid();
    const ownerId = cuid();
    const now = new Date();
    const hashed = await hashPassword(ownerPassword);

    await sql`
      INSERT INTO "Builder" (id, name, email, phone, city, plan, "isActive", timezone, currency, "createdAt", "updatedAt")
      VALUES (
        ${builderId}, ${name.trim()}, ${email.trim().toLowerCase()}, ${phone || null}, ${city || null},
        ${plan}, true, 'Asia/Kolkata', 'INR', ${now}, ${now}
      )
    `;

    await sql`
      INSERT INTO "User" (
        id, name, email, password, phone, role, "builderId", "isActive",
        "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt"
      )
      VALUES (
        ${ownerId}, ${ownerName.trim()}, ${ownerEmail.trim().toLowerCase()}, ${hashed}, ${phone || null},
        'owner', ${builderId}, true, 0, 0, 0, ${now}, ${now}
      )
    `;

    const rows = await sql`
      SELECT
        b.*,
        1 AS user_count,
        0 AS lead_count
      FROM "Builder" b
      WHERE b.id = ${builderId}
      LIMIT 1
    `;
    res.status(201).json(mapCompany(rows[0]));
  } catch (err) {
    console.error('createCompany:', err);
    res.status(500).json({ message: err.message || 'Failed to create company' });
  }
};

export const updateCompany = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();
    const now = new Date();

    const existing = await sql`SELECT id FROM "Builder" WHERE id = ${req.params.id} LIMIT 1`;
    if (!existing.length) return res.status(404).json({ message: 'Company not found' });

    if (req.body.email) {
      const dup = await sql`
        SELECT id FROM "Builder"
        WHERE lower(email) = ${String(req.body.email).trim().toLowerCase()}
          AND id <> ${req.params.id}
        LIMIT 1
      `;
      if (dup.length) return res.status(400).json({ message: 'Company email already exists' });
    }

    await sql`
      UPDATE "Builder"
      SET
        name = COALESCE(${req.body.name ?? null}, name),
        email = COALESCE(${req.body.email ? String(req.body.email).trim().toLowerCase() : null}, email),
        phone = COALESCE(${req.body.phone ?? null}, phone),
        city = COALESCE(${req.body.city ?? null}, city),
        plan = COALESCE(${req.body.plan ?? null}, plan),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const rows = await sql`
      SELECT
        b.*,
        (SELECT COUNT(*)::int FROM "User" u WHERE u."builderId" = b.id) AS user_count,
        (SELECT COUNT(*)::int FROM "Lead" l WHERE l."builderId" = b.id) AS lead_count
      FROM "Builder" b
      WHERE b.id = ${req.params.id}
      LIMIT 1
    `;
    res.json(mapCompany(rows[0]));
  } catch (err) {
    console.error('updateCompany:', err);
    res.status(500).json({ message: err.message || 'Failed to update company' });
  }
};

export const updateCompanyStatus = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();
    const isActive = Boolean(req.body.isActive);
    const now = new Date();

    const existing = await sql`SELECT id FROM "Builder" WHERE id = ${req.params.id} LIMIT 1`;
    if (!existing.length) return res.status(404).json({ message: 'Company not found' });

    await sql`
      UPDATE "Builder" SET "isActive" = ${isActive}, "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    // Deactivate company users when company is deactivated
    if (!isActive) {
      await sql`
        UPDATE "User" SET "isActive" = false, "updatedAt" = ${now}
        WHERE "builderId" = ${req.params.id} AND role <> 'super_admin'
      `;
    }

    const rows = await sql`
      SELECT
        b.*,
        (SELECT COUNT(*)::int FROM "User" u WHERE u."builderId" = b.id) AS user_count,
        (SELECT COUNT(*)::int FROM "Lead" l WHERE l."builderId" = b.id) AS lead_count
      FROM "Builder" b
      WHERE b.id = ${req.params.id}
      LIMIT 1
    `;
    res.json(mapCompany(rows[0]));
  } catch (err) {
    console.error('updateCompanyStatus:', err);
    res.status(500).json({ message: err.message || 'Failed to update company status' });
  }
};

export const getCompanyUsers = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const sql = getSql();

    const company = await sql`SELECT id, name FROM "Builder" WHERE id = ${req.params.id} LIMIT 1`;
    if (!company.length) return res.status(404).json({ message: 'Company not found' });

    const rows = await sql`
      SELECT id, name, email, phone, role, "isActive", "createdAt", "lastLogin"
      FROM "User"
      WHERE "builderId" = ${req.params.id}
      ORDER BY name ASC
    `;

    res.json({
      company: formatId(company[0]),
      users: formatId(rows),
    });
  } catch (err) {
    console.error('getCompanyUsers:', err);
    res.status(500).json({ message: err.message || 'Failed to load company users' });
  }
};
