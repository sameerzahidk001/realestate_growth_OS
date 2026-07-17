import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { hashPassword } from '../lib/password.js';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

export const getUsers = async (req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, email, phone, role, "isActive", "createdAt"
      FROM "User"
      WHERE "builderId" = ${getBuilderId(req.user)} AND "isActive" = true
      ORDER BY name ASC
    `;
    res.json(formatId(rows));
  } catch (err) {
    console.error('getUsers:', err);
    res.status(500).json({ message: err.message || 'Failed to load users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const sql = getSql();
    const { name, email, password, phone, role } = req.body;
    const builderId = getBuilderId(req.user);

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    if (!password?.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const existing = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`;
    if (existing.length) return res.status(400).json({ message: 'Email already exists' });

    const id = cuid();
    const now = new Date();
    const hashed = await hashPassword(password);

    await sql`
      INSERT INTO "User" (
        id, name, email, password, phone, role, "builderId", "isActive",
        "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${name}, ${email}, ${hashed}, ${phone || null}, ${role || 'sales_executive'},
        ${builderId}, true, 0, 0, 0, ${now}, ${now}
      )
    `;

    const rows = await sql`
      SELECT id, name, email, phone, role, "isActive"
      FROM "User" WHERE id = ${id} LIMIT 1
    `;
    res.status(201).json(formatId(rows[0]));
  } catch (err) {
    console.error('createUser:', err);
    res.status(500).json({ message: err.message || 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const { password, ...data } = req.body;
    const now = new Date();
    const newPassword = password?.trim() ? password : null;

    const existing = await sql`
      SELECT id FROM "User" WHERE id = ${req.params.id} AND "builderId" = ${builderId} LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'User not found' });

    if (data.email) {
      const duplicate = await sql`
        SELECT id FROM "User" WHERE email = ${data.email} AND id <> ${req.params.id} LIMIT 1
      `;
      if (duplicate.length) return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = newPassword ? await hashPassword(newPassword) : null;

    await sql`
      UPDATE "User"
      SET
        name = COALESCE(${data.name ?? null}, name),
        email = COALESCE(${data.email ?? null}, email),
        phone = COALESCE(${data.phone ?? null}, phone),
        role = COALESCE(${data.role ?? null}, role),
        password = COALESCE(${hashed}, password),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const rows = await sql`
      SELECT id, name, email, phone, role, "isActive"
      FROM "User" WHERE id = ${req.params.id} LIMIT 1
    `;
    res.json(formatId(rows[0]));
  } catch (err) {
    console.error('updateUser:', err);
    res.status(500).json({ message: err.message || 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();

    const existing = await sql`
      SELECT id FROM "User" WHERE id = ${req.params.id} AND "builderId" = ${builderId} LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'User not found' });

    await sql`
      UPDATE "User" SET "isActive" = false, "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;
    res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error('deleteUser:', err);
    res.status(500).json({ message: err.message || 'Failed to deactivate user' });
  }
};
