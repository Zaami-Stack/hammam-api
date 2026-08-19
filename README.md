# Moroccan Hammam Management System

Production-ready management system for a Moroccan hammam.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + React Router + Axios + Recharts (Vercel-ready)
- **Backend:** Node.js + Express + TypeScript (JWT auth, bcrypt, Zod validation, mysql2)
- **Database:** TiDB Cloud (MySQL-compatible)

The application manages a hammam with two areas (Men / Women), each accepting Adults and
Children, with a configurable price per combination. Reception employees register every visitor
entrance as an individual database record; administrators monitor entrances, revenue, users,
prices and reports. All financial calculations (revenue, counters, statistics) are computed by
the backend from the stored `entries` records — the database is the source of truth.

## Architecture

```text
                    USER
                     |
                     v
              Vercel Frontend
              React + Vite
              Tailwind CSS
                     |
                     | HTTPS REST API
                     v
              Node.js + Express
                  Backend
                     |
                     | Secure SQL connection
                     v
               TiDB Cloud
              MySQL-compatible
                 Database
```

## Features

- Real authentication (JWT in an httpOnly cookie) and role-based authorization (`ADMIN` / `RECEPTION`)
- Entrance registration with a fast 3-step reception interface
  - The frontend displays the price for information only — **the backend always determines
    and stores the authoritative price**
- Historical price preservation: changing a price only affects future entrances; existing
  records are never modified (covered by automated tests)
- Admin dashboard with period filters (today, yesterday, week, month, year, custom) and charts
- Server-side pagination and filtering for entrance history (date range, hammam, category, agent)
- User management: create, edit, activate/deactivate, reset passwords, last-active-admin protection
- Price management (ADMIN only)
- Reports: daily, weekly, monthly, yearly, agent performance
- Audit log for sensitive administrative actions (price changes, user changes)
- Loading / empty / error states on every data screen, toasts, confirmations

## Tech stack

### Frontend (`frontend/`)

- React 19, Vite, TypeScript (strict)
- Tailwind CSS 4
- React Router 7, Axios, Recharts, lucide-react

### Backend (`backend/`)

- Express, TypeScript
- JWT authentication with httpOnly cookie (`hammam_token`), bcrypt password hashing
- Zod request validation, centralized error handling, login rate limiting
- mysql2 connection pool, parameterized queries, transactions for entrance creation

## Project structure

```text
moroccan-hammam-management/
├── frontend/          React + Vite + TypeScript SPA
├── backend/           Express + TypeScript REST API
├── database/
│   ├── migrations/    SQL migrations (0001_initial_schema.sql)
│   └── seeds/         Reference/seeding data
├── README.md
├── .gitignore
└── package.json       Root scripts (dev, build, test, migrate, seed)
```

## Requirements

- Node.js >= 20
- A MySQL-compatible database: TiDB Cloud (production) or local MySQL (development)
- npm

## Database setup

1. Create a TiDB Cloud database (or use a local MySQL server for development).
2. Copy `backend/.env.example` to `backend/.env` and fill in the connection settings.
3. Run the migrations:

```bash
cd backend
npm run migrate
```

4. Seed reference data (hammams, categories, prices, and development users):

```bash
npm run seed
```

5. Reset the development database at any time by re-running the migrate + seed steps.

> **Production:** do not run `npm run seed` against your live database. Migrate the
> production database, then create real staff accounts from the admin UI (Users → Add
> user). The seed script is only for local development.

## Environment variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=            # TiDB Cloud connection string (preferred)
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
DATABASE_SSL=true

JWT_SECRET=              # at least 32 characters
JWT_EXPIRES_IN=12h
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
TRUST_PROXY=false
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=            # e.g. https://your-backend.example.com/api (leave empty in dev — the
                         # Vite dev server proxies /api to http://localhost:5000)
```

Only public configuration belongs in the frontend. Never put database credentials or `JWT_SECRET`
into `VITE_*` variables — anything prefixed `VITE_` is visible in the browser.

## Local development

Start both the backend and the frontend from the project root:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000 (`/api` is proxied by Vite in development)

Or run them individually:

```bash
npm run dev:backend
npm run dev:frontend
```

## Database schema

| Table       | Purpose                                              |
| ----------- | ---------------------------------------------------- |
| `users`     | Staff accounts (`ADMIN` / `RECEPTION`, `is_active`)  |
| `hammams`   | `1 = Men`, `2 = Women`                               |
| `categories`| `1 = Adult`, `2 = Child`                             |
| `prices`    | Current price per hammam/category combination        |
| `entries`   | One row per visitor entrance (price is historical)   |
| `audit_logs`| Immutable trail of sensitive administrative actions  |

Foreign keys are enforced between `entries -> users`, `entries -> hammams`,
`entries -> categories`, `prices -> hammams`, `prices -> categories`. Indexes exist on
`entries.created_at`, `entries.hammam_id`, `entries.category_id`, `entries.user_id`,
`prices.hammam_id`, `prices.category_id` and `users.email`.

### Critical business rule: historical prices

When an entrance is registered:

1. The backend validates the hammam and category.
2. It queries the **current** price from the `prices` table.
3. It stores that price inside `entries.price` and ignores any price sent by the client.

Changing a price to `25 DH` only affects new entrances. An August 1 entry registered at `20 DH`
remains `20 DH` forever, and historical revenue is always calculated as
`SUM(entries.price)` — never against the current `prices` table.

## API overview

Base path: `/api` — every request must include the header `X-Requested-With: XMLHttpRequest`.

Success envelope: `{ "success": true, "data": ... }` (paginated endpoints also return
`pagination: { page, limit, total, totalPages }`). Errors: `{ "success": false, "message": ... }`.

| Method | Endpoint                    | Access                      | Description                          |
| ------ | --------------------------- | --------------------------- | ------------------------------------ |
| POST   | `/auth/login`               | Public                      | Login (sets httpOnly cookie)         |
| POST   | `/auth/logout`              | Authenticated               | Logout                               |
| GET    | `/auth/me`                  | Authenticated               | Current user                         |
| GET    | `/dashboard`                | Authenticated               | Dashboard stats (`?period=&from=&to=`)|
| GET    | `/entries`                  | Authenticated               | Entrance history (paginated, filters)|
| POST   | `/entries`                  | Authenticated               | Register an entrance                 |
| GET    | `/entries/:id`              | Authenticated               | Single entrance                      |
| GET    | `/users`                    | ADMIN                       | List users (search, role, status)    |
| POST   | `/users`                    | ADMIN                       | Create user                          |
| PUT    | `/users/:id`                | ADMIN                       | Edit user                            |
| PATCH  | `/users/:id/status`         | ADMIN                       | Activate/deactivate                  |
| PATCH  | `/users/:id/password`       | ADMIN                       | Reset password                       |
| GET    | `/prices`                   | Authenticated               | Current prices                       |
| PUT    | `/prices/:id`               | ADMIN                       | Update price (future entrances only) |
| GET    | `/hammams`, `/categories`   | Authenticated               | Reference lists                      |
| GET    | `/reports/daily`            | ADMIN                       | `?date=YYYY-MM-DD`                   |
| GET    | `/reports/weekly`           | ADMIN                       | `?date=YYYY-MM-DD` (week starts Monday)|
| GET    | `/reports/monthly`          | ADMIN                       | `?month=YYYY-MM`                     |
| GET    | `/reports/yearly`           | ADMIN                       | `?year=YYYY`                         |
| GET    | `/reports/agents`           | ADMIN                       | `?from=&to=` (defaults to 30 days)   |

Role authorization is enforced by backend middleware: a `RECEPTION` user calling an ADMIN
endpoint receives `403 Forbidden`. Reception users only ever see their own entrances for the
current business day.

## User roles & permissions

### ADMIN

Full access: dashboard, entrance history, revenue, user management, price management, reports,
statistics (agents, Men/Women, Adults/Children distribution).

### RECEPTION

Receive – literally. Login, register entrances (fast interface), view their own entries for the
current day. Cannot change prices, manage users, view reports, or view/modify other agents'
entries. Enforced server-side.

## Timezone handling

Business reporting uses the `Africa/Casablanca` timezone. "Today" always means the current
business day in Morocco, regardless of the browser's timezone. `created_at` is stored in UTC
and shifted to Casablanca for reporting via SQL `DATE_ADD(created_at, INTERVAL offset MINUTE)`.

## Testing

Backend tests use Vitest + Supertest against a dedicated test database (`hammam_test`).

```bash
npm test
```

Covered: login (success/invalid/inactive), admin & reception authorization, entrance creation,
invalid hammam/category, correct price retrieval, price changes, **historical price
preservation** (20 DH entry stays 20 DH after the price moves to 25 DH, revenue 20 + 25 = 45),
dashboard totals, revenue calculations, user activation/deactivation, last-active-admin
protection, pagination, date filtering.

## Security notes

- Passwords are hashed with bcrypt; `password_hash` is never returned by any API endpoint.
- `JWT_SECRET`, database credentials and the SSL CA are server-side environment variables only.
- JWT is delivered in an `httpOnly` cookie (`hammam_token`), `Secure` + `SameSite=None` in
  production; the frontend never stores tokens.
- SQL injection protection via parameterized queries; input validation via Zod before any
  business logic runs.
- Login endpoint is rate-limited. CORS is locked to `CORS_ORIGIN` (no wildcard).

## Deployment

### Frontend → Vercel

1. Push the repository and import `frontend/` as the root directory (or deploy the monorepo
   with the Vite build).
2. Set `VITE_API_URL` to the production backend URL.
3. Configure SPA rewrites so React Router paths fall back to `index.html`.

### Backend

1. Set `NODE_ENV=production`, `PORT`, `DATABASE_URL` (TiDB Cloud connection string),
   `DATABASE_SSL=true`, `JWT_SECRET`, `CORS_ORIGIN` (Vercel URL), `COOKIE_SECURE=true`,
   `TRUST_PROXY=true`.
2. `npm --prefix backend run build` then `node backend/dist/server.js`.
3. Run migrations and seeds against the production database before the first deploy.

### Database → TiDB Cloud

The backend connects to your TiDB Cloud cluster with the SQL connection string provided by
TiDB Cloud (`DATABASE_URL`). `https://auth.tidbcloud.com` and `https://dashboard.belmo.io/` are
management/authentication interfaces, **not** MySQL endpoints — never point the backend at them.

## Troubleshooting

| Problem                                     | Fix                                                              |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `403 Request rejected: missing client header` | Requests must include `X-Requested-With: XMLHttpRequest`         |
| Login works but API calls fail              | Check `JWT_SECRET` is stable across restarts                     |
| CORS errors in the browser                  | Set `CORS_ORIGIN` to the exact frontend origin                   |
| `Table 'x.users' doesn't exist`             | Run `npm run migrate` against the configured database            |
| API calls work but no data                  | Run `npm run seed` (or `npm run db:reset`)                       |

## License

Private project.