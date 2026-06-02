import type {
  AgentProfile,
  AgentRun,
  ContextItem,
  ContextPack,
  Plan,
  Task,
  TokenUsage,
  Project,
} from "@prisma/client";
import type {
  AgentProfileDto,
  AgentRunDto,
  ContextItemDto,
  ContextPackDto,
  PlanDto,
  ProjectDto,
  TaskDto,
  TokenUsageDto,
} from "@agentboard/shared";

export function mapProject(project: Project): ProjectDto {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function mapPlan(plan: Plan): PlanDto {
  return { ...plan, createdAt: plan.createdAt.toISOString() };
}

export function mapTask(task: Task): TaskDto {
  return {
    ...task,
    planId: task.planId ?? null,
    parentTaskId: task.parentTaskId ?? null,
    assignedAgentProfileId: task.assignedAgentProfileId ?? null,
    contextPackId: task.contextPackId ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function mapContextItem(item: ContextItem): ContextItemDto {
  return {
    ...item,
    tags: item.tags ? item.tags.split(",").filter(Boolean) : [],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function mapContextPack(
  pack: ContextPack & { items: Array<{ contextItemId: string; contextItem: ContextItem }> },
): ContextPackDto {
  const currentTokens = pack.items.reduce((sum, item) => sum + item.contextItem.tokenEstimate, 0);
  return {
    id: pack.id,
    projectId: pack.projectId,
    name: pack.name,
    description: pack.description,
    tokenBudget: pack.tokenBudget,
    createdAt: pack.createdAt.toISOString(),
    itemIds: pack.items.map((item) => item.contextItemId),
    currentTokens,
    remainingTokens: pack.tokenBudget - currentTokens,
  };
}

export function mapAgentProfile(profile: AgentProfile): AgentProfileDto {
  return profile;
}

export function mapTokenUsage(tokenUsage: TokenUsage): TokenUsageDto {
  return tokenUsage;
}

export function mapAgentRun(
  run: AgentRun & { tokenUsage: TokenUsage | null },
): AgentRunDto {
  return {
    ...run,
    contextSnapshot: JSON.parse(run.contextSnapshot),
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    tokenUsage: run.tokenUsage ? mapTokenUsage(run.tokenUsage) : null,
  };
}
