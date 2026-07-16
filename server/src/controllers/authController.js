import jwt from 'jsonwebtoken';
import Builder from '../models/Builder.js';
import User from '../models/User.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

export const register = async (req, res) => {
  const { builderName, name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const builder = await Builder.create({ name: builderName, email, phone });
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'owner',
    builder: builder._id,
  });

  const token = signToken(user._id);
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, builder: builder._id },
    builder,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password').populate('builder', 'name plan');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = signToken(user._id);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      builder: user.builder,
    },
  });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('builder');
  res.json(user);
};
