# RULES_MANDATORY.md — Mandatory project rules

> These rules are **mandatory** throughout the entire development of the exercise, for both the developer and the AI (Claude). They must be read and followed **before any action**.

---

## 1. Read the instructions before assuming or coding

Before assuming, designing, or coding **anything**, read the exercise brief first. Nothing is assumed that is not in the instructions; when in doubt, consult the original source.

## 2. Respect the architecture specified in the instructions

All development must adhere to the architecture and technical requirements of the brief:
- Dependency Injection (DI) in both frontend and backend.
- At least one design pattern in the business logic.
- Angular frontend with reactive forms and efficient state management for the total.
- Node.js/TypeScript backend with a REST API, type validation, and MongoDB.

No technologies or approaches are introduced beyond what the instructions allow.

## 3. Document corrections and decisions in AI_LOG.md

Every correction, finding, or relevant decision is recorded in [`AI_LOG.md`](./AI_LOG.md) **at the moment it happens**, so that the documentation is ready and truthful when presenting the exercise.

## 4. Keep the openapi.yaml in mind when building the backend

The [`openapi.yaml`](./openapi.yaml) contract is the **source of truth** for the API. When implementing the backend, adhere to it (routes, types, models) to avoid mistakes and not deviate from the agreed contract.

## 5. Maintain HELPERS and TYPES throughout the whole development

Reuse and strong typing are taken care of continuously, not as later cleanup:

- **Helpers:** when a piece of logic is repeated or is utilitarian (calculations, business validations, mappings, etc.), it is extracted into a **reusable helper** instead of being duplicated. Predictable example: computing the total amount from the damages.
- **Types:** TypeScript types/interfaces are defined and **reused**; `any` is avoided. Shared types (statuses, severity, data shapes) are centralized so there is a single source of truth in the code.
- **Organization:** helpers and types are kept tidy (dedicated folders such as `helpers/` and `types/`, or per module) as the project grows.

The goal is clean, maintainable, low-coupling code throughout the journey, not at the end.
