import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

export const getUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { builderId: getBuilderId(req.user) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  res.json(formatId(users));
};

export const createUser = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      phone,
      role: role || 'sales_executive',
      builderId: getBuilderId(req.user),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });

  res.status(201).json(formatId(user));
};

export const updateUser = async (req, res) => {
  const { password, ...data } = req.body;
  const updateData = { ...data };
  if (password) updateData.password = await hashPassword(password);

  const user = await prisma.user.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: updateData,
  });

  if (!user.count) return res.status(404).json({ message: 'User not found' });

  const updated = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });
  res.json(formatId(updated));
};

export const deleteUser = async (req, res) => {
  const result = await prisma.user.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: { isActive: false },
  });
  if (!result.count) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deactivated' });
};
