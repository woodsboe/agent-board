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

## V1 Runtime

- Agent execution is implemented by a mock runtime that records prompts, output, timing, token usage, and context snapshots.
- Git inspection is handled through a `GitService` abstraction backed by `simple-git`.
- Context diffs are computed by comparing the context snapshot stored on each run.
