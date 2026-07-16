import { neon } from '@neondatabase/serverless';

let sql;

export const getSql = () => {
  if (sql) return sql;

  const url =
    [
      process.env.DATABASE_URL,
      process.env.POSTGRES_URL,
      process.env.DATABASE_URL_UNPOOLED,
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.POSTGRES_PRISMA_URL,
    ].find((u) => u && (u.startsWith('postgresql://') || u.startsWith('postgres://'))) || null;

  if (!url) {
    throw new Error('DATABASE_URL missing (need postgresql:// Neon URL)');
  }

  sql = neon(url);
  return sql;
};

export const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    phone: row.phone,
    role: row.role,
    builderId: row.builderId,
    isActive: row.isActive,
    builder: row.builder_id
      ? { id: row.builder_id, _id: row.builder_id, name: row.builder_name, plan: row.builder_plan }
      : row.builderId
        ? { id: row.builderId, _id: row.builderId }
        : undefined,
  };
};
