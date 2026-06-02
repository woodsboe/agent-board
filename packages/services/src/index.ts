import type { AgentRunDto, GitDashboardDto } from "@agentboard/shared";

export interface GitService {
  inspectRepository(repositoryPath: string): Promise<GitDashboardDto>;
}

export interface AgentService {
  runTask(input: {
    projectId: string;
    taskId: string;
    agentProfileId: string;
    prompt: string;
    contextSnapshot: Array<{
      id: string;
      title: string;
      tokenEstimate: number;
      updatedAt: string;
    }>;
  }): Promise<Pick<AgentRunDto, "status" | "output" | "startedAt" | "completedAt" | "contextSnapshot"> & {
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  }>;
}
