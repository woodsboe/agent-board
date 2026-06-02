import { taskStatuses, type TaskStatus } from "@agentboard/domain";

export function nextStatus(status: TaskStatus): TaskStatus {
  const index = taskStatuses.indexOf(status);
  return taskStatuses[Math.min(index + 1, taskStatuses.length - 1)];
}

export function previousStatus(status: TaskStatus): TaskStatus {
  const index = taskStatuses.indexOf(status);
  return taskStatuses[Math.max(index - 1, 0)];
}
