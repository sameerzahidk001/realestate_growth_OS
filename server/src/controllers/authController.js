import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { hashPassword, matchPassword } from '../lib/password.js';
import { formatId, getUserId } from '../utils/apiFormat.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

export const register = async (req, res) => {
  const { builderName, name, email, password, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const builder = await prisma.builder.create({
    data: { name: builderName, email, phone },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      phone,
      role: 'owner',
      builderId: builder.id,
    },
  });

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: formatId({ ...user, builder: formatId(builder) }),
    builder: formatId(builder),
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET missing on Vercel. Add it in Environment Variables.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { builder: { select: { id: true, name: true, plan: true } } },
    });

    if (!user || !(await matchPassword(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid email or password. Demo user missing? Click Create account OR wait for auto-seed after redeploy.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signToken(user.id);
    res.json({
      token,
      user: formatId(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Login failed', hint: 'Check DATABASE_URL and JWT_SECRET on Vercel' });
  }
};

export const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: getUserId(req.user) },
    include: { builder: true },
  });
  res.json(formatId(user));
};
