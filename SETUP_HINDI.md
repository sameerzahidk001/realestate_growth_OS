# ⚡ 2-Minute Setup (Sirf tumhe yeh karna hai)

Maine **code, PostgreSQL migration, auto-seed, GitHub push** sab kar diya.

Cloud database **tumhare Vercel account** se connect hota hai — iske liye **1 baar browser login** chahiye (main tumhare account me login nahi kar sakta).

---

## Option A — Sabse aasan (2 clicks)

1. Double-click: **`SETUP.bat`** (project folder me)
2. Browser me **Neon integration** khulega → **Install** → apna project `realestate_growth_OS` select karo
3. Vercel me **Redeploy** dabao

**Ho gaya!** Deploy ke baad auto:
- Tables ban jayengi
- Demo data seed hoga
- Login: `owner@skyline.com` / `password123`

---

## Option B — Manual Neon

1. https://neon.tech → Google sign up (free)
2. Copy connection string
3. Vercel → Settings → Environment Variables:
   - `DATABASE_URL` = neon string
   - `JWT_SECRET` = growthos_secret_2026
   - `JWT_EXPIRE` = 7d
   - `VITE_DEMO_PHASE` = 1
   - `CLIENT_URL` = https://realestate-growth-os.vercel.app
4. Redeploy

---

## Local run (Docker Desktop chahiye)

```powershell
cd C:\Users\HP\real-estate-growth-os
.\setup-local.ps1
npm run dev
```

---

## Maine kya khud kiya

- MongoDB → PostgreSQL + Prisma migration
- GitHub push
- Vercel auto table create (`prisma db push`)
- Auto demo seed on first deploy
- Phase 1 demo mode
- Setup scripts

## Tumhe sirf yeh dena hai

**Vercel/Neon account access** (1 baar browser login) — security ki wajah se main yeh step khud nahi kar sakta.

`SETUP.bat` chalao — 2 minute me live ho jayega.
