export const planStatuses = ["Draft", "Approved", "Archived"] as const;
export const taskStatuses = ["Backlog", "Ready", "Running", "Review", "Blocked", "Done"] as const;
export const taskPriorities = ["Low", "Medium", "High", "Critical"] as const;
export const contextTypes = ["Architecture", "Code", "Design", "API", "Decision", "Constraint", "Example"] as const;
export const contextSourceTypes = ["Manual", "File", "Git", "URL", "Figma"] as const;
export const agentRunStatuses = ["Queued", "Running", "Completed", "Failed"] as const;

export type PlanStatus = (typeof planStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type ContextType = (typeof contextTypes)[number];
export type ContextSourceType = (typeof contextSourceTypes)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];

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
