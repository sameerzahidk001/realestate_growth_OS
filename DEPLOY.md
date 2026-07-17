# Vercel + PostgreSQL Deployment (Neon Free)

## 1. Create FREE PostgreSQL (Neon — 2 minutes)

1. Go to **https://neon.tech** → Sign up free
2. **Create Project** → name: `growth-os`
3. Copy the connection string (looks like):
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Vercel Environment Variables

Vercel → Project → **Settings → Environment Variables**

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon connection string (paste exact) |
| `JWT_SECRET` | `growthos_secret_key_2026_random` |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | `https://realestate-growth-os.vercel.app` |
| `VITE_DEMO_PHASE` | `2` |

**Remove old `MONGODB_URI` if it exists.**

## 3. Redeploy

GitHub push triggers auto-deploy, OR manually **Redeploy** in Vercel.

Build automatically runs:
- `prisma generate` — creates DB client
- `prisma db push` — creates all tables
- `vite build` — builds frontend

## 4. Seed demo data (one time)

After first successful deploy, run locally:

```bash
cd C:\Users\HP\real-estate-growth-os\server
set DATABASE_URL=postgresql://YOUR_NEON_CONNECTION_STRING
npm run seed
```

Then login:
- `owner@skyline.com` / `password123`

**OR** use **Create account** on live site (no seed needed).

## 5. Test

- Health: `https://realestate-growth-os.vercel.app/api/health`
- Login: `https://realestate-growth-os.vercel.app/login`

## Local development

```bash
# Use Neon URL or local PostgreSQL
copy server\.env.example server\.env
# Edit DATABASE_URL in server\.env

cd C:\Users\HP\real-estate-growth-os
npm run db:push
npm run seed
npm run dev
```
