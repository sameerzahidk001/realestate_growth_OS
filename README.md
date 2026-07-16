# Growth OS — Real Estate AI Sales Operating System

**India's First AI Sales Operating System for Real Estate Developers**

A full-stack MERN application implementing all 9 phases from the Real Estate Growth OS roadmap.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, DnD Kit
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Auth:** JWT with role-based access control
- **AI:** OpenAI integration (with intelligent fallbacks when no API key)

## Phases Implemented

| Phase | Features |
|-------|----------|
| **Phase 1** | Lead management, CSV import, Kanban pipeline, follow-ups, site visits, projects/units, users/roles, dashboard, reports |
| **Phase 2** | Pilot feedback forms, usage tracking |
| **Phase 3** | AI lead qualification, scoring, follow-up alerts, WhatsApp follow-up |
| **Phase 4** | AI assistant, call summary, proposal PDF, negotiation, voice bot |
| **Phase 5** | Landing page builder, campaign management, portal lead import, AI campaign generator |
| **Phase 6** | Marketing automation, AI content generator, competitor tracker |
| **Phase 7** | Booking, agreement PDF, payment schedule, loan tracking, possession, construction updates, referrals |
| **Phase 8** | Natural language analytics, market intelligence, price recommendation, lead hunter |
| **Phase 9** | Customer portal (booking, payments, construction, complaints) |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### Installation

```bash
cd C:\Users\HP\real-estate-growth-os
npm run install:all
```

### Configure Environment

```bash
copy server\.env.example server\.env
```

Edit `server/.env`:
```
MONGODB_URI=mongodb://localhost:27017/real-estate-growth-os
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...   # Optional — works without it using fallbacks
```

### Seed Demo Data

```bash
npm run seed
```

### Run Development

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:5000

### Demo Login

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@skyline.com | password123 |
| Manager | manager@skyline.com | password123 |
| Executive | amit@skyline.com | password123 |

## Project Structure

```
real-estate-growth-os/
├── client/          # React frontend
│   └── src/
│       ├── pages/   # All feature pages
│       ├── components/
│       └── services/
├── server/          # Express API
│   └── src/
│       ├── models/      # MongoDB schemas
│       ├── controllers/ # Business logic
│       ├── routes/      # API endpoints
│       └── services/    # AI & cron jobs
└── package.json     # Root scripts
```

## API Endpoints

- `POST /api/auth/register` — Register builder + owner
- `POST /api/auth/login` — Login
- `GET /api/leads` — List leads (role-filtered)
- `GET /api/leads/pipeline` — Kanban pipeline data
- `POST /api/leads/import` — CSV import
- `POST /api/leads/:id/ai-qualify` — AI qualification
- `GET /api/dashboard` — Dashboard stats
- `POST /api/ai/assistant` — AI sales assistant
- `POST /api/bookings` — Create booking
- `GET /api/marketing/landing/:slug` — Public landing page
- And 50+ more endpoints across all phases

## Roles

- **owner** — Full access
- **sales_manager** — Team + all leads
- **sales_executive** — Own leads only
- **customer** — Customer portal access

## License

Private — Internal Development
