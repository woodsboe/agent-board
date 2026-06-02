# AgentBoard

AgentBoard is a production-oriented local-first MVP for managing agentic software development work. It combines planning, kanban execution, context curation, Git visibility, mock agent orchestration, and token-cost auditing in a monorepo that is ready for future real AI integrations without depending on them in V1.

## Product Scope

- Local-first persistence with SQLite and local Git repositories
- No authentication, no SaaS dependency, no cloud runtime requirement
- Domain-driven boundaries that isolate UI, persistence, Git, and future AI vendors
- Extensible service contracts for future OpenAI, Claude, Gemini, Codex, and local model runtimes

## Implemented V1 Features

- Projects with repository path tracking
- Plans with draft, approval, and archive flows
- Tasks with kanban status progression, priority, quick movement, and execution hooks
- Context library with creation, search, tagging, filtering-ready data, and tabular browsing
- Context pack builder with token budget tracking and duplication
- Task detail panel with context preview and remaining budget
- Mock agent execution with persisted runs, prompts, outputs, timing, and token usage
- Context diffing between runs via stored snapshots
- Git repository dashboard using `simple-git`
- Project dashboard with task, plan, and token summaries
- Keyboard-first command palette via `Cmd/Ctrl + K`

## Monorepo Layout

```text
agentboard/
  apps/
    api/        Fastify REST API
    desktop/    React + Vite desktop-style web app
  packages/
    domain/     Pure domain enums and context diff helpers
    services/   Service abstractions for Git and agent runtimes
    shared/     DTOs, Zod schemas, and API contract types
    ui/         Shared React Spectrum primitives
  prisma/       SQLite schema, migration, and seed data
  docs/         Architecture notes
```

## Stack

- Frontend: React, TypeScript, Vite, React Router, React Spectrum, Zustand, TanStack Query, Zod
- Backend: Node.js, TypeScript, Fastify
- Database: Prisma + SQLite
- Git: `simple-git`
- Testing: Vitest
- Workspace: pnpm

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `pnpm install`.
3. Generate Prisma client with `pnpm db:generate`.
4. Apply the SQLite migration with `pnpm db:migrate`.
5. Seed demo data with `pnpm db:seed`.
6. Start both apps with `pnpm dev`.

Endpoints after startup:

- Desktop UI: `http://localhost:5173`
- API: `http://localhost:4000`

## Seed Data

The seed script creates:

- Project: `AgentBoard Demo`
- Plans:
  - `Build Authentication`
  - `Migrate Redux to Zustand`
  - `Improve Checkout Performance`
- Tasks across all kanban columns
- Sample context items and a context pack
- Seeded agent profiles
- Seeded agent runs with token usage

## API Surface

- `GET /projects`
- `POST /projects`
- `GET /plans`
- `POST /plans`
- `PATCH /plans/:id/approve`
- `PATCH /plans/:id/archive`
- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `GET /context-items`
- `POST /context-items`
- `PATCH /context-items/:id`
- `DELETE /context-items/:id`
- `GET /context-packs`
- `POST /context-packs`
- `PATCH /context-packs/:id`
- `POST /context-packs/:id/duplicate`
- `GET /agent-profiles`
- `GET /agent-runs`
- `POST /agent-runs`
- `GET /dashboard/:projectId`
- `GET /git/:projectId`

## Extension Seams

- `packages/services/src/index.ts` defines `AgentService` and `GitService`.
- `apps/api/src/services/mock-agent-service.ts` can be replaced by a real model-backed agent runtime.
- `apps/api/src/services/simple-git-service.ts` can be swapped for provider-specific Git integrations later.
- Shared DTOs and Zod schemas in `packages/shared` keep frontend/backend contracts aligned.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Caveats

- I could not run installs, Prisma generation, builds, or tests in this environment because shell execution was unavailable.
- The repository includes the migration SQL and schema, but Prisma client generation still needs to be run locally.
