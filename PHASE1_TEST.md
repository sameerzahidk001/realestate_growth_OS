# Phase 1 — Complete Testing Checklist

Use this list to test MVP (Builder Sales OS) before showing to client.

**Live URL:** https://realestate-growth-os.vercel.app  
**Demo login:** `owner@skyline.com` / `password123`  
**If login fails:** Use **Create account** OR run seed on MongoDB Atlas (see DEPLOY.md)

---

## 0. Pre-requisites (Vercel must have these)

| # | Check | How to verify |
|---|--------|----------------|
| 0.1 | API health works | Open: `https://realestate-growth-os.vercel.app/api/health` → should show `"status":"ok"` |
| 0.2 | MongoDB Atlas connected | Vercel → Settings → Environment Variables → `MONGODB_URI` is set |
| 0.3 | JWT secret set | `JWT_SECRET` exists in Vercel env |
| 0.4 | Demo data exists | Login works OR register new builder account |
| 0.5 | Phase 1 demo mode | `VITE_DEMO_PHASE=1` in Vercel (hides AI, Marketing, Bookings from menu) |

---

## 1. Authentication & Roles

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 1.1 | Login as Owner | Email: `owner@skyline.com`, Password: `password123` | Redirect to Dashboard |
| 1.2 | Wrong password | Enter wrong password | Error message shown (not stuck on "Signing in...") |
| 1.3 | Register new builder | Click "Create account" → fill company + owner details | New account created, lands on Dashboard |
| 1.4 | Logout | Sidebar bottom → Sign out | Returns to login page |
| 1.5 | Role: Sales Executive | Login as `amit@skyline.com` / `password123` | Sees only assigned leads |
| 1.6 | Role: Sales Manager | Login as `manager@skyline.com` / `password123` | Sees all leads + Team menu |

---

## 2. Dashboard

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 2.1 | Stats cards | Open Dashboard (`/`) | Shows: Total Leads, New Today, Site Visits Scheduled, Bookings This Month |
| 2.2 | Due follow-ups | Check left panel | Lists overdue/pending follow-ups with lead names |
| 2.3 | Executive performance | Scroll to table | Shows each executive: leads assigned, converted, conversion %, visits |
| 2.4 | Navigation links | Click "View all follow-ups" | Goes to Follow-ups page |

---

## 3. Lead Management

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 3.1 | View all leads | Go to **Leads** | Table shows name, phone, source, status, AI score, assigned executive |
| 3.2 | Search lead | Search by name or phone (e.g. "Rahul") | Filters list correctly |
| 3.3 | Filter by status | Select status "Negotiation" | Only negotiation leads shown |
| 3.4 | Add lead manually | Click **Add Lead** → fill name, phone, source, assign | New lead appears in list with status "New" |
| 3.5 | Import CSV | Click **Import CSV** → upload file with columns: name, phone, email, source | Multiple leads imported |
| 3.6 | Lead detail | Click any lead name | Opens detail: budget, BHK, timeline, assigned to, activity history |
| 3.7 | Add note | On lead detail → type note → Save | Note appears in Activity History |
| 3.8 | Lead sources | Check source column | Shows: Walk-in, Facebook, Google, Referral, MagicBricks, etc. |

---

## 4. Sales Pipeline (Kanban)

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 4.1 | Pipeline view | Go to **Pipeline** | 7 columns: New → Contacted → Interested → Site Visit Done → Negotiation → Booked → Lost |
| 4.2 | Drag & drop | Drag a lead from "New" to "Contacted" | Lead moves to new column, status updates |
| 4.3 | Lead cards | Check cards in pipeline | Show name, phone, AI score, assigned executive |
| 4.4 | Click lead from pipeline | Click lead name on card | Opens lead detail page |

---

## 5. Follow-ups

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 5.1 | View follow-ups | Go to **Follow-ups** | List of scheduled follow-ups with date, type, executive |
| 5.2 | Overdue count | Check header | Shows overdue + pending counts |
| 5.3 | Schedule follow-up | Click **Schedule** → select lead, date/time, type (call/visit/email) | New follow-up appears in list |
| 5.4 | Complete follow-up | Click **Complete** on pending item → enter summary | Status changes to completed |
| 5.5 | Dashboard sync | Go back to Dashboard | Due follow-ups reflect on dashboard |

---

## 6. Site Visits

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 6.1 | View visits | Go to **Site Visits** | List of scheduled/completed visits |
| 6.2 | Schedule visit | Click **Schedule Visit** → lead + project + date/time | Visit appears as "scheduled" |
| 6.3 | Complete visit | Click **Complete** → enter feedback | Status = completed, feedback saved |
| 6.4 | No-show | Click **No-show** on scheduled visit | Status = no_show |
| 6.5 | Lead status update | After completing visit, check lead in Pipeline | Lead can move to "Site Visit Done" |

---

## 7. Projects & Inventory

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 7.1 | View projects | Go to **Projects** | Cards show project name, location, units, price |
| 7.2 | Add project | Click **Add Project** → name, location, city, amenities | New project appears |
| 7.3 | Project detail | Click a project | Opens units table |
| 7.4 | View units | On project detail | Units show: number, type (2BHK/3BHK), floor, price, status |
| 7.5 | Unit statuses | Check status badges | Available (green), Held (amber), Sold (grey) |
| 7.6 | Add unit | Click **Add Unit** → unit number, type, floor, price | New unit added to inventory |

---

## 8. Users & Roles (Owner/Manager only)

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 8.1 | Team page | Go to **Team** (sidebar) | List of users with roles |
| 8.2 | Add user | Click **Add User** → name, email, password, role | New executive/manager created |
| 8.3 | Role access | Login as Sales Executive | **Team** menu NOT visible |
| 8.4 | Lead isolation | Executive login | Only sees own assigned leads |

---

## 9. Reports

| # | Test | Steps | Expected result |
|---|------|--------|-----------------|
| 9.1 | Lead source report | Go to **Reports** | Bar chart: leads per source (Facebook, Walk-in, etc.) |
| 9.2 | Sales funnel | Check funnel chart | Shows count at each stage (new → booked → lost) |
| 9.3 | Executive conversion | Check horizontal bar chart | Compares assigned vs converted per executive |

---

## 10. Phase 1 scope — should NOT appear in menu

When `VITE_DEMO_PHASE=1`, these must be **hidden**:

- AI Hub
- Marketing
- Landing Pages
- Bookings
- Pilot Feedback

If any of these appear, set `VITE_DEMO_PHASE=1` in Vercel and redeploy.

---

## 11. End-to-end client demo flow (15 min)

1. Login as Owner → Dashboard overview (2 min)
2. Leads → show sources + add one lead (2 min)
3. Pipeline → drag lead across stages (2 min)
4. Follow-ups → schedule a call (2 min)
5. Site Visits → schedule + complete with feedback (2 min)
6. Projects → show inventory units (2 min)
7. Reports → source + funnel charts (2 min)
8. Team → show roles (1 min)

**Closing line for client:**  
*"This is Phase 1 MVP — core Lead → Follow-up → Pipeline workflow. AI features come in Phase 3 after pilot feedback."*

---

## 12. Fix login on Vercel (if still failing)

### Option A — Register (no seed needed)
1. Click **Create account**
2. Register your builder company
3. Login with new credentials

### Option B — Seed MongoDB Atlas
```bash
cd C:\Users\HP\real-estate-growth-os\server
set MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/real-estate-growth-os
npm run seed
```

### Option C — Check Vercel env vars
| Variable | Required |
|----------|----------|
| `MONGODB_URI` | Yes |
| `JWT_SECRET` | Yes |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | `https://realestate-growth-os.vercel.app` |
| `VITE_DEMO_PHASE` | `1` |

After any env change → Vercel → **Redeploy**

---

## Pass / Fail summary

| Module | Pass ☐ | Notes |
|--------|--------|-------|
| Login / Auth | | |
| Dashboard | | |
| Leads | | |
| Pipeline | | |
| Follow-ups | | |
| Site Visits | | |
| Projects / Units | | |
| Team / Roles | | |
| Reports | | |
| Phase 1 menu only | | |
