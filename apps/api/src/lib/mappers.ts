import type {
  AgentProfile,
  AgentRun,
  ContextItem,
  ContextPack,
  Credential,
  GitAccount,
  Plan,
  PlanItem,
  Task,
  TokenUsage,
  Project,
} from "@prisma/client";
import type {
  AgentProfileDto,
  AgentRunDto,
  AgentTokenUsageDto,
  ContextItemDto,
  ContextPackDto,
  CredentialDto,
  GitAccountDto,
  PlanDto,
  PlanItemDto,
  ProjectDto,
  TaskDto,
  TokenUsageDto,
} from "@agentboard/shared";

/** A plan row with its items eagerly loaded (each item optionally linked to its converted task). */
type PlanWithItems = Plan & {
  items?: Array<PlanItem & { task?: { id: string } | null }>;
};

export function mapPlanItem(item: PlanItem & { task?: { id: string } | null }): PlanItemDto {
  return {
    id: item.id,
    planId: item.planId,
    order: item.order,
    title: item.title,
    description: item.description,
    priority: item.priority as PlanItemDto["priority"],
    suggestedAgentProfileId: item.suggestedAgentProfileId ?? null,
    suggestedContextPackId: item.suggestedContextPackId ?? null,
    taskId: item.task?.id ?? null,
  };
}

/** Safely parse JSON provenance stored as a string column; returns null on absent/corrupt data. */
function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function mapProject(project: Project): ProjectDto {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function mapPlan(plan: PlanWithItems): PlanDto {
  return {
    id: plan.id,
    projectId: plan.projectId,
    title: plan.title,
    description: plan.description,
    status: plan.status as PlanDto["status"],
    generatedByProfileId: plan.generatedByProfileId ?? null,
    generationModel: plan.generationModel ?? null,
    generationTokens: parseJson<AgentTokenUsageDto>(plan.generationTokens),
    convertedAt: plan.convertedAt ? plan.convertedAt.toISOString() : null,
    createdAt: plan.createdAt.toISOString(),
    items: (plan.items ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(mapPlanItem),
  };
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
  return {
    id: profile.id,
    name: profile.name,
    description: profile.description,
    systemPrompt: profile.systemPrompt,
    model: profile.model,
    provider: profile.provider as AgentProfileDto["provider"],
    runtimeKind: profile.runtimeKind as AgentProfileDto["runtimeKind"],
    credentialId: profile.credentialId ?? null,
    baseUrl: profile.baseUrl ?? null,
    temperature: profile.temperature ?? null,
    maxTokens: profile.maxTokens ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function mapCredential(credential: Credential): CredentialDto {
  return {
    id: credential.id,
    name: credential.name,
    kind: credential.kind as CredentialDto["kind"],
    provider: credential.provider,
    preview: credential.preview,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  };
}

export function mapGitAccount(account: GitAccount): GitAccountDto {
  return {
    id: account.id,
    name: account.name,
    host: account.host as GitAccountDto["host"],
    authorName: account.authorName,
    authorEmail: account.authorEmail,
    apiBaseUrl: account.apiBaseUrl ?? null,
    remoteUrl: account.remoteUrl ?? null,
    credentialId: account.credentialId ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
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
