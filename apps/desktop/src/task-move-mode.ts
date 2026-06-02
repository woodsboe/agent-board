import type { TaskStatus } from "@agentboard/domain";

export function toggleLiftedTask(currentTaskId: string | null, taskId: string): string | null {
  return currentTaskId === taskId ? null : taskId;
}

export function canDropLiftedTask(liftedTaskId: string | null, liftedTaskStatus: TaskStatus | null, columnStatus: TaskStatus): boolean {
  return Boolean(liftedTaskId) && liftedTaskStatus !== null && liftedTaskStatus !== columnStatus;
}
