export const planStatuses = ["Draft", "Approved", "Archived"] as const;
export const taskStatuses = ["Backlog", "Ready", "Running", "Review", "Blocked", "Done"] as const;
export const taskPriorities = ["Low", "Medium", "High", "Critical"] as const;
export const contextTypes = ["Architecture", "Code", "Design", "API", "Decision", "Constraint", "Example"] as const;
export const contextSourceTypes = ["Manual", "File", "Git", "URL", "Figma"] as const;
export const agentRunStatuses = ["Queued", "Running", "Completed", "Failed"] as const;

/** Agent runtimes. `mock` always runs offline and is the fallback when a profile has no usable credential. */
export const agentProviders = ["mock", "anthropic", "openai", "openai-compatible", "claude-cli", "codex-cli"] as const;
/** How an agent executes: a hosted/local HTTP API, or a spawned local CLI binary. */
export const runtimeKinds = ["api", "cli"] as const;
/** Git hosting providers we can read pull requests and issues from. */
export const gitHosts = ["github", "gitlab", "generic"] as const;
/** What a stored secret is used for. */
export const credentialKinds = ["provider_api_key", "git_pat"] as const;

export type PlanStatus = (typeof planStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type ContextType = (typeof contextTypes)[number];
export type ContextSourceType = (typeof contextSourceTypes)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type AgentProvider = (typeof agentProviders)[number];
export type RuntimeKind = (typeof runtimeKinds)[number];
export type GitHost = (typeof gitHosts)[number];
export type CredentialKind = (typeof credentialKinds)[number];

/** Maps each provider to the runtime it executes under — used by UI and the adapter registry. */
export const providerRuntimeKind: Record<AgentProvider, RuntimeKind> = {
  mock: "api",
  anthropic: "api",
  openai: "api",
  "openai-compatible": "api",
  "claude-cli": "cli",
  "codex-cli": "cli",
};

export type ContextSnapshotItem = {
  id: string;
  title: string;
  tokenEstimate: number;
  updatedAt: string;
};

export type ContextDiff = {
  added: ContextSnapshotItem[];
  removed: ContextSnapshotItem[];
  modified: ContextSnapshotItem[];
};

export function diffContextSnapshots(
  previous: ContextSnapshotItem[],
  current: ContextSnapshotItem[],
): ContextDiff {
  const prevMap = new Map(previous.map((item) => [item.id, item]));
  const currentMap = new Map(current.map((item) => [item.id, item]));

  const added = current.filter((item) => !prevMap.has(item.id));
  const removed = previous.filter((item) => !currentMap.has(item.id));
  const modified = current.filter((item) => {
    const prev = prevMap.get(item.id);
    return Boolean(prev && (prev.updatedAt !== item.updatedAt || prev.tokenEstimate !== item.tokenEstimate || prev.title !== item.title));
  });

  return { added, removed, modified };
}
