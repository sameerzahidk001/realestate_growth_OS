import jwt from 'jsonwebtoken';
import { getSql, mapUser } from '../lib/neonSql.js';
import { hashPassword, matchPassword } from '../lib/password.js';
import { formatId, getUserId } from '../utils/apiFormat.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const cuid = () =>
  'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const register = async (req, res) => {
  try {
    const { builderName, name, email, password, phone } = req.body;
    const sql = getSql();

    const existing = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`;
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const builderId = cuid();
    const userId = cuid();
    const hashed = await hashPassword(password);
    const now = new Date();

    await sql`
      INSERT INTO "Builder" (id, name, email, phone, plan, "isActive", timezone, currency, "createdAt", "updatedAt")
      VALUES (${builderId}, ${builderName}, ${email}, ${phone || null}, 'pilot', true, 'Asia/Kolkata', 'INR', ${now}, ${now})
    `;

    await sql`
      INSERT INTO "User" (id, name, email, password, phone, role, "builderId", "isActive", "leadsAssigned", "leadsConverted", "siteVisitsCompleted", "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${hashed}, ${phone || null}, 'owner', ${builderId}, true, 0, 0, 0, ${now}, ${now})
    `;

    const token = signToken(userId);
    res.status(201).json({
      token,
      user: formatId({
        id: userId,
        name,
        email,
        role: 'owner',
        builderId,
        builder: { id: builderId, name: builderName, plan: 'pilot' },
      }),
      builder: formatId({ id: builderId, name: builderName, email, phone }),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET missing on Vercel. Add it in Environment Variables.' });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT u.*, b.id as builder_id, b.name as builder_name, b.plan as builder_plan
      FROM "User" u
      LEFT JOIN "Builder" b ON b.id = u."builderId"
      WHERE u.email = ${email}
      LIMIT 1
    `;

    const user = mapUser(rows[0]);
    if (!user || !(await matchPassword(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid email or password. Demo user missing? Click Create account.',
      });
    }

    await sql`UPDATE "User" SET "lastLogin" = ${new Date()}, "updatedAt" = ${new Date()} WHERE id = ${user.id}`;

    const token = signToken(user.id);
    delete user.password;
    res.json({ token, user: formatId(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Login failed', hint: 'Check DATABASE_URL and JWT_SECRET on Vercel' });
  }
};

export const getMe = async (req, res) => {
  try {
    const sql = getSql();
    const id = getUserId(req.user);
    const rows = await sql`
      SELECT u.*, b.id as builder_id, b.name as builder_name, b.plan as builder_plan
      FROM "User" u
      LEFT JOIN "Builder" b ON b.id = u."builderId"
      WHERE u.id = ${id}
      LIMIT 1
    `;
    const user = mapUser(rows[0]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    delete user.password;
    res.json(formatId(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
