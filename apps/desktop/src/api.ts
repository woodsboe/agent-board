import type {
  AgentProfileDto,
  AgentRunDto,
  AgentRunWithDiffDto,
  ContextItemDto,
  ContextPackDto,
  CreateAgentRunInput,
  CreateContextItemInput,
  CreateContextPackInput,
  CreatePlanInput,
  CreateProjectInput,
  CreateTaskInput,
  DashboardDto,
  GitDashboardDto,
  PlanDto,
  ProjectDto,
  TaskDto,
  UpdateContextItemInput,
  UpdateContextPackInput,
  UpdatePlanInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@agentboard/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  getProjects: () => request<ProjectDto[]>("/projects"),
  createProject: (input: CreateProjectInput) => request<ProjectDto>("/projects", { method: "POST", body: JSON.stringify(input) }),
  updateProject: (id: string, input: UpdateProjectInput) => request<ProjectDto>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  getPlans: (projectId: string) => request<PlanDto[]>(`/plans?projectId=${projectId}`),
  createPlan: (input: CreatePlanInput) => request<PlanDto>("/plans", { method: "POST", body: JSON.stringify(input) }),
  updatePlan: (id: string, input: UpdatePlanInput) => request<PlanDto>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  approvePlan: (id: string) => request<PlanDto>(`/plans/${id}/approve`, { method: "PATCH" }),
  archivePlan: (id: string) => request<PlanDto>(`/plans/${id}/archive`, { method: "PATCH" }),
  getTasks: (projectId: string) => request<TaskDto[]>(`/tasks?projectId=${projectId}`),
  createTask: (input: CreateTaskInput) => request<TaskDto>("/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: string, input: UpdateTaskInput) => request<TaskDto>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  getContextItems: (projectId: string) => request<ContextItemDto[]>(`/context-items?projectId=${projectId}`),
  createContextItem: (input: CreateContextItemInput) => request<ContextItemDto>("/context-items", { method: "POST", body: JSON.stringify(input) }),
  updateContextItem: (id: string, input: UpdateContextItemInput) =>
    request<ContextItemDto>(`/context-items/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteContextItem: (id: string) => request<void>(`/context-items/${id}`, { method: "DELETE" }),
  getContextPacks: (projectId: string) => request<ContextPackDto[]>(`/context-packs?projectId=${projectId}`),
  createContextPack: (input: CreateContextPackInput) => request<ContextPackDto>("/context-packs", { method: "POST", body: JSON.stringify(input) }),
  updateContextPack: (id: string, input: UpdateContextPackInput) =>
    request<ContextPackDto>(`/context-packs/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteContextPack: (id: string) => request<void>(`/context-packs/${id}`, { method: "DELETE" }),
  duplicateContextPack: (id: string) => request<ContextPackDto>(`/context-packs/${id}/duplicate`, { method: "POST" }),
  getAgentProfiles: () => request<AgentProfileDto[]>("/agent-profiles"),
  getAgentRuns: (projectId: string) => request<AgentRunWithDiffDto[]>(`/agent-runs?projectId=${projectId}`),
  runAgent: (input: CreateAgentRunInput) => request<AgentRunDto>("/agent-runs", { method: "POST", body: JSON.stringify(input) }),
  getDashboard: (projectId: string) => request<DashboardDto>(`/dashboard/${projectId}`),
  getGitDashboard: (projectId: string) => request<GitDashboardDto>(`/git/${projectId}`),
};
