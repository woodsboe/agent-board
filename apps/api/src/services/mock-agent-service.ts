import type { AgentService } from "@agentboard/services";

export class MockAgentService implements AgentService {
  async runTask(input: Parameters<AgentService["runTask"]>[0]) {
    const startedAt = new Date();
    const promptTokens = 300 + input.contextSnapshot.reduce((sum, item) => sum + item.tokenEstimate, 0);
    const completionTokens = 180 + Math.floor(input.prompt.length / 12);
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = Number((totalTokens * 0.0000025).toFixed(4));
    const completedAt = new Date(startedAt.getTime() + 1500);

    return {
      status: "Completed" as const,
      output: [
        "Mock execution completed successfully.",
        "Task analyzed.",
        "Recommended changes generated.",
        "Review required.",
      ].join("\n"),
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      contextSnapshot: input.contextSnapshot,
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
      },
    };
  }
}
