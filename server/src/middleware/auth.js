import jwt from 'jsonwebtoken';
import { getSql, mapUser } from '../lib/neonSql.js';
import { formatId } from '../utils/apiFormat.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }

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
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    delete user.password;
    req.user = formatId(user);
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this role' });
  }
  next();
};
