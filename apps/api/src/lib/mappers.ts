import type {
  AgentProfile,
  AgentRun,
  ContextItem,
  ContextPack,
  Credential,
  GitAccount,
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
  CredentialDto,
  GitAccountDto,
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
