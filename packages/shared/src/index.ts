import { z } from "zod";
import {
  agentProviders,
  agentRunStatuses,
  contextSourceTypes,
  contextTypes,
  credentialKinds,
  gitHosts,
  planStatuses,
  runtimeKinds,
  taskPriorities,
  taskStatuses,
} from "@agentboard/domain";
import type { GitHost } from "@agentboard/domain";

export const idSchema = z.string().min(1);
export const timestampSchema = z.string().datetime();

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  gitRepositoryPath: z.string().min(1),
  gitAccountId: idSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const planSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(planStatuses),
  createdAt: timestampSchema,
});

export const taskSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  planId: idSchema.nullable().optional(),
  parentTaskId: idSchema.nullable().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  assignedAgentProfileId: idSchema.nullable().optional(),
  contextPackId: idSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const contextItemSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(contextTypes),
  tokenEstimate: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  sourceType: z.enum(contextSourceTypes),
  sourceReference: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const contextPackSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  tokenBudget: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  itemIds: z.array(idSchema),
  currentTokens: z.number().int().nonnegative(),
  remainingTokens: z.number().int(),
});

export const agentProfileSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  systemPrompt: z.string().min(1),
  model: z.string().min(1),
  provider: z.enum(agentProviders),
  runtimeKind: z.enum(runtimeKinds),
  credentialId: idSchema.nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  maxTokens: z.number().int().nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const credentialSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: z.enum(credentialKinds),
  provider: z.string().min(1),
  preview: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const gitAccountSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  host: z.enum(gitHosts),
  authorName: z.string().min(1),
  authorEmail: z.string().min(1),
  apiBaseUrl: z.string().nullable().optional(),
  remoteUrl: z.string().nullable().optional(),
  credentialId: idSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tokenUsageSchema = z.object({
  id: idSchema,
  agentRunId: idSchema,
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCost: z.number().nonnegative(),
});

export const agentRunSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  taskId: idSchema,
  agentProfileId: idSchema,
  status: z.enum(agentRunStatuses),
  prompt: z.string(),
  output: z.string(),
  error: z.string().nullable().optional(),
  contextSnapshot: z.array(
    z.object({
      id: idSchema,
      title: z.string(),
      tokenEstimate: z.number().int(),
      updatedAt: timestampSchema,
    }),
  ),
  startedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  tokenUsage: tokenUsageSchema.nullable().optional(),
});

export const contextSnapshotItemSchema = z.object({
  id: idSchema,
  title: z.string(),
  tokenEstimate: z.number().int(),
  updatedAt: timestampSchema,
});

export const contextDiffSchema = z.object({
  added: z.array(contextSnapshotItemSchema),
  removed: z.array(contextSnapshotItemSchema),
  modified: z.array(contextSnapshotItemSchema),
});

export const createProjectInputSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createPlanInputSchema = planSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(planStatuses).default("Draft"),
});

export const createTaskInputSchema = taskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createContextItemInputSchema = contextItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createContextPackInputSchema = contextPackSchema.omit({
  id: true,
  createdAt: true,
  currentTokens: true,
  remainingTokens: true,
});

export const createAgentRunInputSchema = z.object({
  projectId: idSchema,
  taskId: idSchema,
  agentProfileId: idSchema,
});

export const createAgentProfileInputSchema = agentProfileSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    runtimeKind: z.enum(runtimeKinds).optional(),
  });

export const createCredentialInputSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(credentialKinds),
  provider: z.string().min(1),
  secret: z.string().min(1),
});

export const updateCredentialInputSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  secret: z.string().min(1).optional(),
});

export const createGitAccountInputSchema = gitAccountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pull requests / issues read from a Git host (GitHub or GitLab) via the account token.
export const pullRequestSchema = z.object({
  id: z.union([z.string(), z.number()]),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  author: z.string(),
  url: z.string(),
  isDraft: z.boolean(),
  updatedAt: timestampSchema,
});

export const issueSchema = z.object({
  id: z.union([z.string(), z.number()]),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  author: z.string(),
  url: z.string(),
  updatedAt: timestampSchema,
});

export const updateProjectInputSchema = createProjectInputSchema.partial();
export const updatePlanInputSchema = createPlanInputSchema.partial();
export const updateTaskInputSchema = createTaskInputSchema.partial();
export const updateContextItemInputSchema = createContextItemInputSchema.partial();
export const updateContextPackInputSchema = createContextPackInputSchema.partial();
export const updateAgentProfileInputSchema = createAgentProfileInputSchema.partial();
export const updateGitAccountInputSchema = createGitAccountInputSchema.partial();

export type ProjectDto = z.infer<typeof projectSchema>;
export type PlanDto = z.infer<typeof planSchema>;
export type TaskDto = z.infer<typeof taskSchema>;
export type ContextItemDto = z.infer<typeof contextItemSchema>;
export type ContextPackDto = z.infer<typeof contextPackSchema>;
export type AgentProfileDto = z.infer<typeof agentProfileSchema>;
export type AgentRunDto = z.infer<typeof agentRunSchema>;
export type TokenUsageDto = z.infer<typeof tokenUsageSchema>;
export type CredentialDto = z.infer<typeof credentialSchema>;
export type GitAccountDto = z.infer<typeof gitAccountSchema>;
export type PullRequestDto = z.infer<typeof pullRequestSchema>;
export type IssueDto = z.infer<typeof issueSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreatePlanInput = z.infer<typeof createPlanInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type CreateContextItemInput = z.infer<typeof createContextItemInputSchema>;
export type CreateContextPackInput = z.infer<typeof createContextPackInputSchema>;
export type CreateAgentRunInput = z.infer<typeof createAgentRunInputSchema>;
export type CreateAgentProfileInput = z.infer<typeof createAgentProfileInputSchema>;
export type CreateCredentialInput = z.infer<typeof createCredentialInputSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialInputSchema>;
export type CreateGitAccountInput = z.infer<typeof createGitAccountInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
export type UpdateContextItemInput = z.infer<typeof updateContextItemInputSchema>;
export type UpdateContextPackInput = z.infer<typeof updateContextPackInputSchema>;
export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileInputSchema>;
export type UpdateGitAccountInput = z.infer<typeof updateGitAccountInputSchema>;
export type ContextSnapshotItemDto = z.infer<typeof contextSnapshotItemSchema>;
export type ContextDiffDto = z.infer<typeof contextDiffSchema>;

/** Server-sent events streamed while an agent run executes. */
export type AgentRunEvent =
  | { type: "status"; status: AgentRunDto["status"] }
  | { type: "chunk"; text: string }
  | { type: "done"; run: AgentRunDto }
  | { type: "error"; message: string };

export type DashboardDto = {
  projectId: string;
  openTasks: number;
  runningTasks: number;
  completedTasks: number;
  activePlans: number;
  approvedPlans: number;
  recentRuns: AgentRunDto[];
  tokenUsageByProject: number;
  tokenUsageByAgent: Array<{ agentName: string; totalTokens: number; estimatedCost: number }>;
};

export type GitCommitDto = {
  hash: string;
  message: string;
  author: string;
  date: string;
};

export type GitDashboardDto = {
  branch: string;
  latestCommit: string;
  modifiedFiles: string[];
  untrackedFiles: string[];
  ahead: number;
  behind: number;
  tracking: string | null;
  branches: string[];
  recentCommits: GitCommitDto[];
  account: { id: string; name: string; authorName: string; authorEmail: string; host: GitHost } | null;
};

export type AgentRunWithDiffDto = AgentRunDto & {
  contextDiff: ContextDiffDto | null;
};
