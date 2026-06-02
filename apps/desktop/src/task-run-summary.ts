import type { AgentRunWithDiffDto, TaskDto } from "@agentboard/shared";

export type TaskRunSummary = {
  latestRun: AgentRunWithDiffDto | null;
  runCount: number;
  totalTokens: number;
  totalCost: number;
};

export function buildTaskRunSummary(tasks: TaskDto[], agentRuns: AgentRunWithDiffDto[]): Record<string, TaskRunSummary> {
  return Object.fromEntries(
    tasks.map((task) => {
      const runs = agentRuns
        .filter((run) => run.taskId === task.id)
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
      const summary: TaskRunSummary = {
        latestRun: runs[0] ?? null,
        runCount: runs.length,
        totalTokens: runs.reduce((sum, run) => sum + (run.tokenUsage?.totalTokens ?? 0), 0),
        totalCost: Number(runs.reduce((sum, run) => sum + (run.tokenUsage?.estimatedCost ?? 0), 0).toFixed(4)),
      };
      return [task.id, summary];
    }),
  ) as Record<string, TaskRunSummary>;
}
