# AVR Growth OS — Phase 1 + Phase 2 Live Checklist

**Live URL:** https://realestate-growth-os.vercel.app  
**Health:** https://realestate-growth-os.vercel.app/api/health → `"version": "3.1.0"`  
**Before testing:** Hard refresh (`Ctrl + Shift + R`)

---

## Demo Logins

| Panel | Email | Password | After login |
|-------|--------|----------|-------------|
| Super Admin | `superadmin@avrgrowthos.com` | `password123` | `/admin` |
| Company Owner | `owner@skyline.com` | `password123` | Company dashboard |
| Manager | `manager@skyline.com` | `password123` | Company panel |
| Executive | `amit@skyline.com` | `password123` | Assigned leads only |

Login page par **Reset demo passwords** bhi hai agar fail ho.

**Vercel env required:** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE=7d`, `CLIENT_URL`, `VITE_DEMO_PHASE=2`

---

## A. Pre-checks

| # | Check | Expected |
|---|--------|----------|
| A1 | Open `/api/health` | `status: ok`, `dbPing: true`, `version: 3.1.0` |
| A2 | Open `/login` | Brand = **AVR Growth OS**; Super Admin + Company demo credentials dikhein |
| A3 | Company menu | Dashboard, Leads, Pipeline, Follow-ups, Site Visits, Projects, Reports, **Pilot Feedback**, Team (owner/manager) |
| A4 | Hidden in Phase 2 | AI Hub, Marketing, Landing Pages, Bookings **nahi** dikhne chahiye |

---

## B. Super Admin Panel (Phase 1 platform)

Login: `superadmin@avrgrowthos.com` / `password123`

| # | Check | Expected |
|---|--------|----------|
| B1 | Redirect | `/admin` Super Admin panel |
| B2 | Dashboard stats | Total/Active companies, users, leads cards |
| B3 | Companies list | Companies table with plan/status/users/leads |
| B4 | Add Company | Create company + owner account → list mein dikhe |
| B5 | Edit Company | Name/city/plan save ho |
| B6 | Users button | Company users read-only list |
| B7 | Deactivate | Company inactive; Activate se wapas |
| B8 | Company routes blocked | Super admin company leads page open na kare (redirect `/admin`) |

---

## C. Company Panel — Phase 1

Login: `owner@skyline.com` / `password123`

### Auth & roles
| # | Check | Expected |
|---|--------|----------|
| C1 | Owner login | Dashboard open |
| C2 | Executive login `amit@...` | Sirf assigned leads |
| C3 | Sign out | Login page |

### Dashboard & Reports
| # | Check | Expected |
|---|--------|----------|
| C4 | Dashboard | Stats / overdue follow-ups load |
| C5 | Reports | Charts/data load (no blank error) |

### Leads
| # | Check | Expected |
|---|--------|----------|
| C6 | Leads list | Pagination + search/filter |
| C7 | Add Lead | Create success |
| C8 | Edit Lead | Save changes |
| C9 | Delete Lead | Green success message; list se hat jaye |
| C10 | Lead detail | Page blank na ho |
| C11 | CSV Import | Use `/sample-leads.csv`; green import message |
| C12 | Qualify (optional) | AI qualify button error ya update dikhe |

### Pipeline
| # | Check | Expected |
|---|--------|----------|
| C13 | Pipeline | Columns by status; drag/status update (agar enabled) |

### Follow-ups
| # | Check | Expected |
|---|--------|----------|
| C14 | Schedule | **Date + Time dono** select → create |
| C15 | Edit / Complete / Delete | Sab kaam + errors visible |

### Site Visits
| # | Check | Expected |
|---|--------|----------|
| C16 | Schedule visit | Lead + Project + Date/Time |
| C17 | Edit / Complete / Delete | Kaam kare |

### Projects
| # | Check | Expected |
|---|--------|----------|
| C18 | Add / Edit project | Amenities save |
| C19 | Delete project | List se hate |
| C20 | Project detail | Units list; Add/Edit/Delete unit |

### Team
| # | Check | Expected |
|---|--------|----------|
| C21 | Add User | **Unique email** (e.g. `new@skyline.com`) |
| C22 | Edit User | Save Changes |
| C23 | Deactivate | User inactive |

---

## D. Company Panel — Phase 2

| # | Check | Expected |
|---|--------|----------|
| D1 | Menu | **Pilot Feedback** dikhe |
| D2 | Open Pilot Feedback | Usage section + weekly form |
| D3 | Navigate modules | Leads/Pipeline etc open karo → Usage counts badhein |
| D4 | Submit feedback | Week, rating 1–5, features → green success |
| D5 | Previous feedback | Submitted entry list mein dikhe |
| D6 | Usage refresh | Feature Usage section updated counts |

---

## E. Quick fail notes

- CSV: columns `name,phone,email,source,notes` — name + phone required  
- Follow-up/Visit: time empty (`--:--`) → error “select both date and time”  
- Team Add: duplicate email (`owner@skyline.com`) → “Email already exists”  
- Login fail: **Reset demo passwords** then retry  
- Vercel pe Phase 2 menu na dikhe: Settings → Env → `VITE_DEMO_PHASE=2` → Redeploy

---

## Done criteria

- [ ] Health `3.1.0` + `dbPing: true`
- [ ] Super Admin companies CRUD OK
- [ ] Company Phase 1 CRUD (leads/follow-ups/projects/team) OK
- [ ] Pilot Feedback submit + usage tracking OK
- [ ] Phase 3+ menus hidden
