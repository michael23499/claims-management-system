# Claims Management System

A full-stack tool for claim managers to administer **claims** with multiple associated **damages**. Each claim has a status and a total amount computed from its damages. Full Stack technical challenge — Bdeo.

Built with **Spec-Driven Development**: each endpoint is specified in `openapi.yaml` before being implemented.

## Tech stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Backend      | NestJS (Node.js / TypeScript), Repository Pattern, DI |
| Frontend     | Angular 20 (standalone, signals, reactive forms)      |
| Database     | MongoDB + Mongoose (ODM)                              |
| API contract | OpenAPI 3.0 (`openapi.yaml`)                        |
| Tests        | Jest — backend & frontend                            |
| Dev database | Docker Compose (MongoDB)                              |

## Features

- Create / list / view claims; manage damages (add, edit, delete) within a claim.
- **Total amount updates in real time** (reactive signals) on add / remove / edit.
- Status lifecycle with business rules (cancel only from pending; >100-char description to finalize a claim with a high-severity damage; damages only editable while pending).
- Real image upload (stored and served by the backend) with live preview (drag & drop).
- Form validation, input length limits, and layered error handling (inline + a global banner).
- Paginated claim list (newest first) and a reusable design system (tokens + components).

## Project structure

```
claims-management-system/
├── openapi.yaml         # API contract — source of truth
├── docker-compose.yml   # Local MongoDB
├── backend/             # NestJS API
└── frontend/            # Angular app
```

## Prerequisites

- **Node.js 22+**
- **Docker** (for the local MongoDB)
- **pnpm** — enable it via Corepack (ships with Node, nothing to install):
  ```bash
  corepack enable
  ```

## Getting started

From the repo root, **two commands**:

```bash
pnpm run setup   # installs root + backend + frontend
pnpm dev         # starts MongoDB (Docker) + API + web, all together
```

- **API** →  http://localhost:3000 (Swagger UI at `/api`)
- **Web** → http://localhost:4200

That's it. `pnpm dev` brings up the Docker MongoDB and both apps with one command (via `concurrently`); CORS is already enabled between them.

**Sample data:** on first run, if the database is empty it **auto-seeds** 12 example claims (covering every status and severity, with computed totals — enough to show pagination) so the app shows real data right away — no need to create anything by hand. Reload them anytime with:

```bash
pnpm seed   # clears and reloads the sample claims (needs MongoDB running)
```

<details>
<summary>Running pieces individually / notes</summary>

```bash
pnpm run db                  # just MongoDB (docker compose up -d)
pnpm -C backend run start:dev
pnpm -C frontend start
```

The API connects to `mongodb://localhost:27018/claims` by default (the Docker MongoDB is mapped to host port **27018** to avoid clashing with a local MongoDB on 27017). Point it elsewhere (e.g. MongoDB Atlas) with the `MONGODB_URI` environment variable. Uploaded damage images are stored under `backend/uploads/` and served at `/uploads`.

</details>

## Tests and coverage

> Challenge requirement: **>95% coverage** on backend business logic. Both backend and frontend reach **100%** across all four metrics (statements, branches, functions, lines).

**One command, no Docker required** (integration tests use an in-memory MongoDB):

```bash
pnpm test:cov   # from the repo root — runs backend + frontend coverage
```

<details>
<summary>Per-package</summary>

```bash
pnpm -C backend run test:cov
pnpm -C frontend run test:cov
```

</details>

Each `test:cov` writes an HTML report to `coverage/lcov-report/index.html` and prints its
link when it finishes. Open it by pasting that link, or run
`start coverage/lcov-report/index.html` (Windows) / `open ...` (macOS).

**Backend** tests compile with SWC (`@swc/jest`), which emits decorator metadata without
the `typeof T === 'undefined' ? Object : T` ternary that `ts-jest` produces — so coverage
is not polluted by phantom branches from NestJS DI. Only declarative, logic-free files are
excluded (`*.module.ts`, `*.schema.ts`, `main.ts`); the schema's only logic (the `toJSON`
transform) was extracted to a tested helper, so excluding it hides nothing. The app build
uses `tsc` (`nest build`); SWC only compiles the tests.

**Frontend** tests use Jest (`jest-preset-angular`), headless — the same testing stack as
the backend. The reactive total, form validation, services, status rules, image upload and
error handling are all covered. Declarative config (`app.config.ts`, `app.routes.ts`) is
excluded from the report.

## API contract

`openapi.yaml` is the source of truth for the API (paths, models, types). Endpoints are added to it before being implemented.

## AI usage

How AI was used and supervised during development is documented in [`AI_LOG.md`](./AI_LOG.md).
