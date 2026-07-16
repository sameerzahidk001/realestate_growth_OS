import User from '../models/User.js';

export const getUsers = async (req, res) => {
  const users = await User.find({ builder: req.user.builder._id }).select('-password');
  res.json(users);
};

export const createUser = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || 'sales_executive',
    builder: req.user.builder._id,
  });

  const result = user.toObject();
  delete result.password;
  res.status(201).json(result);
};

export const updateUser = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id },
    req.body,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id },
    { isActive: false },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deactivated' });
};
