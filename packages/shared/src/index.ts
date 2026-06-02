import { z } from "zod";
import {
  agentRunStatuses,
  contextSourceTypes,
  contextTypes,
  planStatuses,
  taskPriorities,
  taskStatuses,
} from "@agentboard/domain";

export const idSchema = z.string().min(1);
export const timestampSchema = z.string().datetime();

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  gitRepositoryPath: z.string().min(1),
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

export type ProjectDto = z.infer<typeof projectSchema>;
export type PlanDto = z.infer<typeof planSchema>;
export type TaskDto = z.infer<typeof taskSchema>;
export type ContextItemDto = z.infer<typeof contextItemSchema>;
export type ContextPackDto = z.infer<typeof contextPackSchema>;
export type AgentProfileDto = z.infer<typeof agentProfileSchema>;
export type AgentRunDto = z.infer<typeof agentRunSchema>;
export type TokenUsageDto = z.infer<typeof tokenUsageSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreatePlanInput = z.infer<typeof createPlanInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type CreateContextItemInput = z.infer<typeof createContextItemInputSchema>;
export type CreateContextPackInput = z.infer<typeof createContextPackInputSchema>;
export type CreateAgentRunInput = z.infer<typeof createAgentRunInputSchema>;

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

export type GitDashboardDto = {
  branch: string;
  latestCommit: string;
  modifiedFiles: string[];
  untrackedFiles: string[];
};
