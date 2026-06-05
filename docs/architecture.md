# AgentBoard Architecture

## Principles

- Local-first persistence with SQLite and local Git repositories
- Domain-first package boundaries
- Service abstractions for agent execution and Git inspection
- Typed contracts shared between frontend and backend

## Layers

- `packages/domain`: entities, enums, and pure domain helpers
- `packages/services`: service contracts and default implementations
- `packages/shared`: DTOs, Zod schemas, API contracts, and utility types
- `apps/api`: REST API, orchestration services, Prisma persistence
- `apps/desktop`: React Spectrum shell and feature surfaces

## Agent Runtime

- Every runtime implements one interface, `AgentAdapter` (`packages/services`), whose `runTask(input, onChunk)` streams text and resolves to a status + output + token usage.
- `apps/api/src/services/adapters/` provides the implementations — `anthropic-api`, `openai-api` (also OpenAI-compatible/local via `baseUrl`), `claude-cli`, `codex-cli`, and `mock` — selected per agent profile by `registry.ts`.
- `resolveAdapter` falls back to the mock runtime when an API provider has no usable credential (or a local provider has no base URL), so a run never hard-fails purely for lack of configuration.
- Runs are asynchronous: `POST /agent-runs` persists a `Running` row and executes in the background; output streams to subscribers via an in-memory broker (`lib/run-broker.ts`) and `GET /agent-runs/:id/stream` (SSE). The run is finalized to `Completed`/`Failed` with output, token usage, and any error.
- Context diffs are computed by comparing the context snapshot stored on each run.

## Secrets

- Credentials are encrypted at rest with AES-256-GCM (`lib/crypto.ts`). The key is sourced from `AGENTBOARD_SECRET_KEY` or an auto-generated `prisma/.secret.key`.
- Plaintext is decrypted only inside the API process when resolving an adapter or Git token; the API surface exposes only a masked preview.

## Git

- `GitService` (`simple-git`) provides identity-aware repo inspection plus GitHub/GitLab pull-request and issue reads via `fetch`.
- A `Project` links to a `GitAccount` (commit identity + host + optional PAT credential); the Git routes resolve and decrypt the token before each host call.

## Navigation Architecture

- The desktop shell uses a two-level information architecture:
  - a global `Dashboard` for cross-project visibility
  - a project-scoped workspace for operational surfaces
- Project-scoped routes live under `/projects/:projectId/*`.
- Each project exposes the same child surfaces:
  - `dashboard`
  - `plans`
  - `tasks`
  - `context`
  - `agent-runs`
  - `git`
- Sidebar expansion state for each project is persisted locally in the UI store so users can control navigation density per machine/profile.
- Project selection still exists as UI state for convenience, but route params are the source of truth for project-scoped pages.
