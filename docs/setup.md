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
- The Git dashboard reads the local repository path stored on each project record.

## Suggested Next Steps

- Replace the mock agent runtime with a real adapter behind `AgentService`
- Add repository import and path validation flows
- Expand forms to richer Spectrum pickers instead of raw ID fields
- Add integration tests after local install is available
