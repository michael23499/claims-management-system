# Backend — Claims Management System API

NestJS + Mongoose REST API for the claims management system. See the
[root README](../README.md) for the full project overview, stack and setup, and
[`openapi.yaml`](../openapi.yaml) for the API contract (the source of truth).

## Commands

```bash
pnpm install          # install dependencies
pnpm run start:dev    # run the API in watch mode (http://localhost:3000)
pnpm test             # run the test suite (unit + integration)
pnpm run test:cov     # run tests with the coverage report
pnpm run build        # compile to dist/
```

Requires a running MongoDB — start it from the repo root with `docker compose up -d`.
Swagger UI is at **http://localhost:3000/api** while the app is running.
