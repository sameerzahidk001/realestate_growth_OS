# Vercel Deployment Guide

## 1. GitHub Push (done via terminal)

```bash
cd C:\Users\HP\real-estate-growth-os
git init
git add .
git commit -m "Initial commit: Growth OS MERN full platform"
git branch -M main
git remote add origin https://github.com/sameerzahidk001/realestate_growth_OS.git
git push -u origin main
```

## 2. MongoDB Atlas (Required for production)

1. Go to https://cloud.mongodb.com → Create free cluster
2. Database Access → Add user + password
3. Network Access → Add IP `0.0.0.0/0` (allow all)
4. Connect → Get connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/real-estate-growth-os
   ```

## 3. Vercel Deploy

1. Go to https://vercel.com → Login with GitHub
2. **Add New Project** → Import `sameerzahidk001/realestate_growth_OS`
3. Settings (auto-detected from vercel.json):
   - **Root Directory:** `.` (project root)
   - **Build Command:** `cd client && npm install && npm run build`
   - **Output Directory:** `client/dist`

4. **Environment Variables** (Vercel → Project → Settings → Environment Variables):

| Name | Value |
|------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Any long random secret string |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | `https://your-app.vercel.app` (after first deploy) |
| `VITE_DEMO_PHASE` | `1` (Phase 1 demo for client) |
| `OPENAI_API_KEY` | Optional |

5. Click **Deploy**

6. After deploy, update `CLIENT_URL` to your actual Vercel URL and redeploy.

## 4. Seed production database (one time)

Run locally with production MongoDB URI:

```bash
cd server
set MONGODB_URI=mongodb+srv://...
npm run seed
```

## 5. Live URLs

- App: `https://realestate-growth-os.vercel.app` (or your assigned URL)
- API health: `https://your-url.vercel.app/api/health`

## Demo Login

- `owner@skyline.com` / `password123`
