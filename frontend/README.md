# Frontend — Claims Management System

Angular 20 app for the claims tool: a claim **list** and a claim **detail** view with
a damages table, a real-time total, image upload and status management. See the
[root README](../README.md) for the full setup.

## Development server

```bash
pnpm install
pnpm start
```

Opens at **http://localhost:4200**. The app talks to the backend API at
`http://localhost:3000` (keep it running). The API base URL lives in
`src/environments/environment.ts`.

## Tests

```bash
pnpm test          # run unit tests (Jest)
pnpm run test:cov  # run with coverage (HTML report + link)
```

Tests run on **Jest** (`jest-preset-angular`), headless — the same stack as the backend.
Coverage is **100%** across statements, branches, functions and lines.

## Architecture notes

- **Standalone components** + **signals** for state; `computed()` for the reactive total.
- **Reactive forms** with validation; `inject()` for DI.
- `ClaimsService` / `UploadsService` (`providedIn: 'root'`) wrap the REST API.
- Layered error handling: an HTTP **error interceptor** + a global banner for
  connection / server errors, plus inline messages for validation errors.

## Build

```bash
pnpm run build   # outputs to dist/
```
