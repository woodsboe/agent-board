# AgentBoard

AgentBoard is a production-oriented, local-first tool for orchestrating agentic software development work. It combines planning, kanban execution, context curation, multi-account Git visibility, real agent orchestration (Claude & Codex, plus OpenAI-compatible local models), live run streaming, and token-cost auditing in a clean monorepo. Real runtimes are pluggable adapters; when no credential is configured, agents transparently fall back to an offline mock runtime so the app always works out of the box.

## Navigation Model

- Global `Dashboard` acts as the portfolio control tower for connected agents, tracked projects, running tasks, recent runs, and aggregate token usage.
- `Projects` is the entry point for project management and workspace selection.
- Every project owns the same workspace structure:
  - `Dashboard`
  - `Plans`
  - `Tasks`
  - `Context`
  - `Agent Runs`
  - `Git`
- Project groups in the sidebar can be expanded or collapsed independently, and that UI state is persisted locally.

## Product Scope

- Local-first persistence with SQLite and local Git repositories
- No authentication, no SaaS dependency, no cloud runtime requirement
- Domain-driven boundaries that isolate UI, persistence, Git, and future AI vendors
- Extensible service contracts for future OpenAI, Claude, Gemini, Codex, and local model runtimes

## Implemented Features

- Projects with repository path tracking and per-project Git account selection
- Plans with draft, approval, and archive flows
- Tasks on a kanban board with native drag-and-drop, keyboard movement (← / →), a create/edit dialog, and a tabbed detail drawer (Overview / Context / Runs)
- Context library with creation, search, tagging, and tabular browsing
- Context pack builder with token budget tracking and duplication
- **Pluggable agent runtimes** behind a single `AgentAdapter` interface:
  - Anthropic Messages API (`@anthropic-ai/sdk`)
  - OpenAI + any OpenAI-compatible endpoint (`openai`) — covers cloud OpenAI and local servers like Ollama / LM Studio via a base URL
  - Local **Claude Code** and **Codex** CLIs (spawned in the project repo)
  - Mock runtime (default fallback when no credential is connected)
- **Asynchronous, streamed agent runs** — runs execute in the background and stream live output to the UI over Server-Sent Events; real token usage when the runtime reports it, estimated otherwise
- Context diffing between runs via stored snapshots
- **Multiple Git accounts** — distinct commit identities + GitHub/GitLab host tokens; open pull requests and issues are read per project
- **Encrypted credential store** — API keys and Git tokens are encrypted at rest (AES-256-GCM); only masked previews ever leave the API
- Git dashboard (branch, ahead/behind, status, branches, recent commits) using `simple-git`
- Global and per-project dashboards with task, plan, and token summaries
- Searchable, keyboard-first command palette via `Cmd/Ctrl + K`

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
- Backend: Node.js, TypeScript, Fastify (SSE for run streaming)
- Agents: `@anthropic-ai/sdk`, `openai` (+ OpenAI-compatible local servers), spawned `claude` / `codex` CLIs
- Database: Prisma + SQLite
- Git: `simple-git` + GitHub/GitLab REST
- Secrets: Node `crypto` (AES-256-GCM at rest)
- Testing: Vitest (unit), Playwright (e2e)
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

## End-to-End Tests

Install the Playwright browser once:

```bash
pnpm test:e2e:install
```

Run the smoke suite:

```bash
pnpm test:e2e
```

Artifacts are written to `output/playwright/`.

## Seed Data

The seed script creates:

- Project: `AgentBoard Demo`
- Plans:
  - `Build Authentication`
  - `Migrate Redux to Zustand`
  - `Improve Checkout Performance`
- Tasks across all kanban columns
- Sample context items and a context pack
- Agent profiles spanning every runtime (Claude API & CLI, Codex CLI, OpenAI, local Ollama) — all credential-free so they run via the mock fallback until you connect a key
- A demo Git account (`Local Workspace`) linked to the project
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
- `POST /agent-profiles`
- `PATCH /agent-profiles/:id`
- `DELETE /agent-profiles/:id`
- `GET /agent-runs`
- `POST /agent-runs` (starts a background run)
- `GET /agent-runs/:id/stream` (Server-Sent Events: status / chunk / done / error)
- `GET /credentials`
- `POST /credentials`
- `PATCH /credentials/:id`
- `DELETE /credentials/:id`
- `GET /git-accounts`
- `POST /git-accounts`
- `PATCH /git-accounts/:id`
- `DELETE /git-accounts/:id`
- `GET /dashboard/:projectId`
- `GET /git/:projectId`
- `GET /git/:projectId/pull-requests`
- `GET /git/:projectId/issues`

## Connecting a Real Agent

1. Open **Settings → Credentials** and add a provider API key (encrypted on save).
2. Open **Settings → Agent Profiles**, add/edit a profile, pick its provider (Anthropic, OpenAI, OpenAI-compatible, Claude CLI, Codex CLI), model, and — for API providers — the credential.
3. Assign the profile to a task and press **Run Agent** in the task drawer to watch output stream live.

CLI runtimes (`claude` / `codex`) require the binaries on your `PATH` (override with `AGENTBOARD_CLAUDE_BIN` / `AGENTBOARD_CODEX_BIN`) and run inside the project's repository path.

## Connecting Git Accounts

1. Add a **Git token** credential (GitHub/GitLab PAT) under Settings → Credentials.
2. Under **Settings → Git Accounts**, create an account with a commit identity (name/email), host, remote URL, and the token.
3. Link the account to a project on the **Projects** page. The project's **Git** page then shows status, branches, commits, and open pull requests / issues.

## Extension Seams

- `packages/services/src/index.ts` defines the `AgentAdapter` and `GitService` contracts.
- `apps/api/src/services/adapters/` holds one file per runtime plus `registry.ts`; add a new adapter and a `resolveAdapter` case to support another provider or local model.
- `apps/api/src/services/simple-git-service.ts` can be extended with more hosts or write operations.
- Shared DTOs and Zod schemas in `packages/shared` (with enums in `packages/domain`) keep frontend/backend contracts aligned.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:headed`
- `pnpm test:e2e:install`
- `pnpm lint`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Security Notes

- Credentials (API keys, Git PATs) are encrypted at rest with AES-256-GCM and never returned by the API — responses carry only a masked preview (e.g. `sk-a…wxyz`).
- The encryption key comes from `AGENTBOARD_SECRET_KEY`, or is auto-generated at `prisma/.secret.key` (gitignored) on first use. Set `AGENTBOARD_SECRET_KEY` explicitly for any shared/persistent deployment.
- This is a local-first tool with no authentication layer; run it on a trusted machine.

## Caveats

- CLI runtimes require the `claude` / `codex` binaries installed locally; API runtimes require your own keys. Without either, profiles run on the offline mock runtime.
- Pull request / issue reads cover GitHub and GitLab; agent-initiated commit/push is intentionally out of scope for now.
