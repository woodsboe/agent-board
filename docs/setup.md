# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+

## First Run

1. Create `.env` from `.env.example`.
2. Run `pnpm install`.
3. Run `pnpm db:generate`.
4. Run `pnpm db:migrate`.
5. Run `pnpm db:seed`.
6. Run `pnpm dev`.

## Local Data

- SQLite database path is controlled by `DATABASE_URL`.
- The default `.env.example` uses `file:./dev.db`.
- Credentials are encrypted with a key from `AGENTBOARD_SECRET_KEY`, or an auto-generated `prisma/.secret.key` (gitignored).
- The Git dashboard reads the local repository path stored on each project record.
- Sidebar project expansion/collapse preferences are stored locally in the browser profile.

## Connecting Real Runtimes

- **API agents (Claude / OpenAI / local):** add a credential in Settings → Credentials, then point an Agent Profile at it. For local models, choose the `openai-compatible` provider and set a base URL (e.g. `http://localhost:11434/v1`).
- **CLI agents (Claude Code / Codex):** install the `claude` / `codex` binaries (override paths with `AGENTBOARD_CLAUDE_BIN` / `AGENTBOARD_CODEX_BIN`). They run inside the project's repository path.
- **Git:** add a GitHub/GitLab token credential, create a Git account in Settings, and link it to a project.

## End-to-End Tests

- Install the browser once: `pnpm test:e2e:install`.
- Run `pnpm db:seed` for a deterministic fixture, then `pnpm test:e2e`.
