# Mentora — Learning & Guidance

A discipline-agnostic e-learning and guidance platform. **Mentora** ("learning and
guidance") offers courses across every discipline. At launch it ships with two
seeded content verticals:

- **200 Engineering Software courses** ($20 each)
- **1,000 Recipes** ($5 each, or a 100-recipe booklet for $50)

`Discipline` is a first-class entity, so adding new verticals (medicine, music,
finance, …) requires no re-architecting — just new discipline rows and content.

---

## Stack

| Layer     | Choice                                             | Why |
|-----------|----------------------------------------------------|-----|
| Frontend  | **React 18 + Vite + React Router**                 | Fast SPA dev, simple routing, no heavyweight framework needed for this scope. |
| Backend   | **Node.js + Express**                              | Small, explicit, easy to read; matches the recommended stack. |
| ORM/DB    | **Prisma + PostgreSQL**                            | Normalized relational schema fits the nested course structure; Prisma gives type-safe queries + migrations. |
| Auth      | **JWT + bcryptjs**                                 | Stateless auth, hashed passwords, role-based access. |
| Payments  | **Stripe (test mode)** with a local **mock mode**  | Real sandbox checkout when a key is set; auto-completing mock so the flow is demoable with zero credentials. |
| Validation| **Zod**                                            | Declarative request validation + input sanitization. |

---

## Project structure

```
mentora/
├─ docker-compose.yml        # local Postgres
├─ package.json              # root convenience scripts
├─ REQUIREMENTS_MAP.md       # every requirement → where it lives
├─ server/
│  ├─ prisma/
│  │  ├─ schema.prisma       # full data model
│  │  ├─ seed.js             # seeds 200 courses + 1000 recipes + booklets
│  │  └─ seed-content.js     # course & recipe content generators
│  └─ src/
│     ├─ index.js / app.js   # server entry + Express assembly
│     ├─ config/env.js
│     ├─ lib/                # prisma client, jwt
│     ├─ middleware/         # auth, validate, error, asyncHandler
│     ├─ services/           # grading, access-control, payments, auth
│     ├─ controllers/        # auth, catalog, learn, purchase, dashboard, admin
│     ├─ routes/
│     └─ validation/schemas.js
└─ client/
   └─ src/
      ├─ api/                # fetch client + formatters
      ├─ context/AuthContext.jsx
      ├─ components/         # Nav, BuyButton, Markdown, ProtectedRoute
      └─ pages/              # Home, Courses, CourseDetail, CourseLearn,
                             # AssessmentPage, Recipes, RecipeDetail, Booklets,
                             # Login, Register, Dashboard, Admin, ...
```

---

## Setup

### Prerequisites
- Node.js 18+ (tested on 24)
- PostgreSQL 14+ — the easiest path is Docker (`docker compose up -d`)

### 1. Start the database

**Option A — Docker (recommended):**
```bash
docker compose up -d
```
Starts Postgres on `localhost:5432` with db/user/pass all `mentora`, matching
`server/.env.example`.

**Option B — no Docker (embedded Postgres):** if you can't run Docker, the
server bundles a real Postgres binary you can run locally:
```bash
cd server && npm install && npm run pg:embedded
```
This creates a UTF-8 cluster in `server/.pgdata` on `localhost:5432` with the
same credentials. Leave it running in its own terminal.

(Or point `DATABASE_URL` at any Postgres you already have.)

### 2. Configure the server
```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
npm install
```
Leave `STRIPE_SECRET_KEY` blank to run in **mock payment mode** (purchases
auto-complete locally). To use real Stripe test checkout, set your test keys.

### 3. Create the schema & seed data
```bash
npm run prisma:generate
npm run prisma:migrate      # creates tables (migration name: init)
npm run seed                # 200 courses + 1000 recipes + booklets + demo users
```
> The full seed inserts ~140k rows and takes a couple of minutes. For a quick
> demo with the **same structure** but less volume:
> ```bash
> COURSE_LIMIT=6 RECIPE_LIMIT=200 npm run seed
> ```

### 4. Run the API
```bash
npm run dev                 # http://localhost:4000  (health: /api/health)
```

### 5. Run the frontend (new terminal)
```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```
Vite proxies `/api` to the backend, so no CORS setup is needed in dev.

### Demo logins
| Role    | Email                | Password     |
|---------|----------------------|--------------|
| Learner | learner@mentora.dev  | Learner123!  |
| Admin   | admin@mentora.dev    | Admin123!    |

The demo learner already owns one course and one recipe so the dashboard is populated.

---

## How grading works

Both conditions must be true to pass a course:

1. **Overall average ≥ 60%**
2. **Self-assessment average ≥ 50%**

Metrics (see `server/src/services/grading.service.js`):
- `selfAssessmentAverage` = mean of the learner's **best** attempt on each of the
  10 topic assessments (unattempted = 0).
- `notesCompletionPercent` = % of the 10 topics marked notes-read.
- `overallAverage` = `0.5 × notesCompletion + 0.5 × selfAssessmentAverage`.

Keeping notes and quizzes as separate inputs makes the two gates genuinely
independent. Grading is recomputed server-side on every notes/quiz change; the
snapshot is cached on the `Enrollment` row.

## Tests

An end-to-end smoke test exercises the full learner journey against a running
server (auth, access control, notes progress, server-side quiz grading, the
60%/50% pass gates, completion, and gated PDF downloads):

```bash
cd server && npm run dev      # in one terminal
npm test                       # in another — 15 checks, exits non-zero on failure
```

## Security notes
- Passwords are bcrypt-hashed; auth is via JWT bearer tokens.
- **Correct quiz answers (`Choice.isCorrect`) are never sent to the client
  before grading** — the assessment endpoint omits them, and grading happens on
  the server (`grading.service.js` + `learn.controller.js`).
- Content access is enforced by `access.service.js`: course/recipe/booklet
  content is only served to owners (a PAID `Purchase`) or staff.
- Prices are read from the database at checkout — the client can't set amounts.
- Inputs validated with Zod; `helmet`, CORS, and rate limiting are enabled.

## Payments
- **Mock mode** (no Stripe key): `POST /api/purchases/checkout` creates a PAID
  purchase immediately and the UI unlocks content inline.
- **Stripe test mode** (key set): creates a real test Checkout Session and
  redirects; the `checkout.session.completed` webhook marks the purchase PAID.
  Point a Stripe CLI listener at `POST /api/purchases/webhook`.

## API surface (summary)
```
POST /api/auth/register | /login        GET /api/auth/me
GET  /api/catalog/disciplines | courses | courses/:slug | recipes | booklets
POST /api/purchases/checkout            GET /api/purchases/mine
POST /api/purchases/webhook             (Stripe, raw body)
GET  /api/learn/courses/:slug/content   POST /api/learn/courses/notes
GET  /api/learn/assessments/:id         POST /api/learn/assessments/:id/submit
GET  /api/learn/recipes/:slug/content
GET  /api/dashboard
GET  /api/admin/stats  POST /api/admin/{disciplines,recipes,courses}  PATCH /api/admin/:type/:id/publish
```

## Departments

The catalog is organised into three departments (each a first-class
`Discipline`, proving the extensible design):

| Department | Content | Notes |
|---|---|---|
| **Engineering Tools** | 200 real engineering-software tools (CAD, CAE/FEA, CFD, EDA, process, civil, BIM, CAM, aerospace…) + the real **PVsyst** course | Grouped by category; PVsyst is real, PDF-sourced content |
| **Programming** | Software-development courses (Python, JavaScript, React, Go…) | Kept from the original catalog |
| **Recipes** | 1,000 recipes + 100-recipe booklets | |

The learner **dashboard is subdivided by these three departments**, each with its
own progress summary.

## Study notes & downloads

Every course carries **structured study notes** (module overview → concept pages
with reference blocks and reviewer-flag callouts → worked example → self-test),
following the professional curriculum/notes format. Owners can **download a
course's notes** after learning, in two formats:

- **PDF** — `GET /api/learn/courses/:slug/notes.pdf` (server-rendered via pdfkit)
- **Markdown** — `GET /api/learn/courses/:slug/notes.md`

Both are owner-gated and exposed as buttons on the course learning page.

## Real content: PVsyst

The **PVsyst** course under Engineering Tools is built from the supplied
`01-pvsyst-curriculum.pdf` and `01-pvsyst-notes.pdf` (text extracted to
`server/prisma/data/pvsyst-raw.json`). It uses the real 10-module structure,
real hands-on labs / knowledge checks, and the real study-notes prose. It is
flagged `isPlaceholder: false`.

## Content

Courses and recipes ship with **finished, professional-reading content** generated
from templates in `seed-content.js` — structured study notes (overview → concept
pages → worked example → self-test), 30 labs per course, and 10-question
assessments whose questions are answerable from the notes. The **PVsyst** course
carries genuinely real, PDF-sourced material.

To author deeper, genuinely tool-specific prose at scale, run the optional Claude
pipeline (`server/prisma/generate-content.js`), which rewrites a course's notes
and assessments one topic at a time, validates them, and writes transactionally:

```bash
cd server
# Needs an Anthropic API key in .env:
GEN_LIMIT=5 npm run generate:content           # 5 courses
GEN_SLUG=autocad npm run generate:content       # one specific course
# No key: runs in a structured mock mode so the pipeline is demonstrable.
npm run generate:content
```
Generating all 200+ courses is ~2,000 API calls — run in batches. Model defaults
to `claude-sonnet-5` (override with `GEN_MODEL`).
