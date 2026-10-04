# Hirevelo

Hirevelo is an Applicant Tracking System (ATS) for small hiring teams and
independent recruiters. It brings job vacancies, applications, interview notes,
and hiring decisions into one place so recruiters can follow each candidate's
progress and candidates can check the status of their own applications.

## Who it is for

- **Recruiters:** publish vacancies, review applications and CVs, move candidates
  through hiring stages, record interview notes, and review activity history.
- **Candidates:** browse published vacancies, apply with a CV and cover note, and
  track their application status.

Recruiter accounts are provisioned by an operator; candidate registration is
self-service. Hirevelo is designed for a single organization, with two roles and
a fixed recruitment pipeline.

## Hiring workflow

The planned workflow follows these stages:

```text
Applied → Screening → Interview → Offering → Hired
```

A candidate can also be rejected from any active stage, with a recorded reason.
Stage changes retain an activity history showing who made the change and when.
Closing a vacancy stops new applications while existing candidates can continue
through the pipeline; archiving makes the vacancy and its pipeline read-only.

## Project scope

The MVP covers vacancy management, candidate applications, CV uploads, interview
notes, activity history, and a recruiter dashboard. It does not include AI resume
scoring, messaging, calendar scheduling, billing, or configurable pipeline stages.

The project is under development. The current application provides the database
foundation and interface placeholders; the hiring and authentication workflows
are still being built.

## Technology

Hirevelo uses one Next.js App Router application for the frontend and server,
TypeScript, PostgreSQL with Prisma, and Tailwind CSS with shadcn/ui components.
Auth.js is the authentication framework. There is no separate backend service.
Vitest and Playwright support automated testing, and Docker Compose provides the
local PostgreSQL database.

## Local setup

Node.js 22.13+, npm, and Docker Compose are required.

```sh
cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Routes: `/`, `/careers`, `/sign-in`, `/register`,
`/recruiter`, `/recruiter/jobs`, `/recruiter/candidates`, and `/applications`.
Navigation destinations currently contain placeholders. The recruiter layout uses
a development/test session stub; production redirects it to `/sign-in`. The stub
does not authorize private queries or mutations. The recent-job sidebar displays
public published-job titles.

Compose runs PostgreSQL 16 bound to localhost with a persistent named volume and
healthcheck. Its credentials are local demo values. `POSTGRES_PORT` optionally
changes the host port; update both database URLs in `.env` to match.

Environment variables are validated at server boot; invalid/missing values fail
with field names, without printing secrets. `DATABASE_URL`, `AUTH_SECRET` (32+
characters), `AUTH_URL`, and `STORAGE_DIR` are required. `LOG_LEVEL` defaults to
`debug` in development and `info` in production. Recruiter seed variables are
optional together in development; production seeding requires both. The `.env`
file, uploads, build output, and browser traces are ignored.

## Database and demo data

Three migrations establish core entities, history/files, then Auth.js tables.
Tables use mapped plural names, cuid defaults, UTC timestamps, explicit foreign
keys, list indexes, and database uniqueness constraints. Activity references use
`Restrict`; notes cascade only when no history prevents application deletion.

`npm run db:seed` is idempotent: 1 recruiter, 3 candidates, 5 jobs across all four
statuses, 6 applications across all stages, interview notes, and activity entries.
Demo password: `Demo-password-123`; recruiter email: `recruiter@example.com`
(unless overridden); candidates: `candidate1@example.com` through `candidate3@example.com`.
Demo accounts cannot sign in yet. CV rows are metadata placeholders without
corresponding uploaded files.
Inspect the complete dataset with `npm run db:studio`; the sidebar shows the two
published demo jobs. Existing seed rows/accounts are preserved on repeat runs.

`npm run db:reset` destroys the configured database and reapplies migrations; use
only with a disposable development database. It does not seed automatically.

## Commands and tests

| Command                                          | Purpose                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `npm run dev`                                    | Development server                                               |
| `npm run build` / `npm start`                    | Production build / server                                        |
| `npm run lint`                                   | ESLint, including zero warnings                                  |
| `npm run typecheck`                              | Route generation + strict TypeScript checks                      |
| `npm run format` / `npm run format:check`        | Format / check source and configs                                |
| `npm run db:migrate`                             | Apply committed migrations                                       |
| `npm run db:migrate:dev`                         | Author a new development migration                               |
| `npm run db:generate`                            | Generate Prisma client                                           |
| `npm run db:seed` / `npm run db:reset`           | Seed / reset development data                                    |
| `npm test`                                       | Unit and integration suites                                      |
| `npm run test:unit` / `npm run test:integration` | Individual test layers                                           |
| `npm run test:e2e`                               | Playwright shell, keyboard, mobile, axe, health, and retry tests |

Create a separate disposable test database before running integration tests:

```sh
docker compose exec -T db createdb -U hirevelo hirevelo_test
DATABASE_URL='postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test' npm run db:migrate
npm test
npx playwright install chromium
npm run test:e2e
```

Create `hirevelo_test` only once. `DATABASE_URL_TEST` selects the integration
connection; tests reject database names not ending in `_test`. Integration setup
clears only that database, then seeds fixtures. The health failure test exercises
an actual unreachable PostgreSQL connection. Tests use Vitest and real PostgreSQL,
not an in-memory database. Shared Auth.js session roles are checked by TypeScript.

Playwright starts its own development server on port 3100 to exercise the
non-production shell stub. It temporarily installs an error fixture page and
removes it and its generated dev route types on exit; no test route is shipped.
Do not run another dev server on port 3100 during this suite.

## Project documentation

- [Product specification](PROJECT_SPEC.md): roles, user journeys, scope, and business rules.
- [Engineering guide](ENGINEERING.md): architecture, conventions, and operational requirements.
- [Design guide](DESIGN.md): layouts, components, and visual tokens.
- [Implementation tickets](TASKS.md): acceptance criteria and development progress.
