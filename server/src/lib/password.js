import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => bcrypt.hash(password, 12);

export const matchPassword = async (entered, hashed) => bcrypt.compare(entered, hashed);
