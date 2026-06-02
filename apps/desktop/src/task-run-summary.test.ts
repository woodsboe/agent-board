import { describe, expect, it } from "vitest";
import type { AgentRunWithDiffDto, TaskDto } from "@agentboard/shared";
import { buildTaskRunSummary } from "./task-run-summary";

describe("buildTaskRunSummary", () => {
  it("aggregates latest run, token totals, and cost totals by task", () => {
    const tasks = [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Task One",
        description: "First task",
        status: "Backlog",
        priority: "High",
        planId: null,
        parentTaskId: null,
        assignedAgentProfileId: null,
        contextPackId: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "task-2",
        projectId: "project-1",
        title: "Task Two",
        description: "Second task",
        status: "Ready",
        priority: "Medium",
        planId: null,
        parentTaskId: null,
        assignedAgentProfileId: null,
        contextPackId: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
    ] satisfies TaskDto[];

    const runs = [
      {
        id: "run-1",
        projectId: "project-1",
        taskId: "task-1",
        agentProfileId: "profile-1",
        status: "Completed",
        prompt: "Prompt 1",
        output: "Output 1",
        contextSnapshot: [],
        contextDiff: null,
        startedAt: "2026-06-01T10:00:00.000Z",
        completedAt: "2026-06-01T10:05:00.000Z",
        tokenUsage: {
          id: "usage-1",
          agentRunId: "run-1",
          promptTokens: 200,
          completionTokens: 300,
          totalTokens: 500,
          estimatedCost: 0.0125,
        },
      },
      {
        id: "run-2",
        projectId: "project-1",
        taskId: "task-1",
        agentProfileId: "profile-1",
        status: "Failed",
        prompt: "Prompt 2",
        output: "Output 2",
        contextSnapshot: [],
        contextDiff: null,
        startedAt: "2026-06-02T10:00:00.000Z",
        completedAt: "2026-06-02T10:05:00.000Z",
        tokenUsage: {
          id: "usage-2",
          agentRunId: "run-2",
          promptTokens: 120,
          completionTokens: 80,
          totalTokens: 200,
          estimatedCost: 0.005,
        },
      },
    ] satisfies AgentRunWithDiffDto[];

    const summary = buildTaskRunSummary(tasks, runs);

    expect(summary["task-1"].runCount).toBe(2);
    expect(summary["task-1"].totalTokens).toBe(700);
    expect(summary["task-1"].totalCost).toBe(0.0175);
    expect(summary["task-1"].latestRun?.id).toBe("run-2");
    expect(summary["task-2"].runCount).toBe(0);
    expect(summary["task-2"].latestRun).toBeNull();
  });
});
