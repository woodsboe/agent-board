import type {
  AgentProfileDto,
  AgentRunDto,
  AgentRunEvent,
  AgentRunWithDiffDto,
  ContextItemDto,
  ContextPackDto,
  CreateAgentProfileInput,
  CreateAgentRunInput,
  CreateContextItemInput,
  CreateContextPackInput,
  CreateCredentialInput,
  CreateGitAccountInput,
  CreatePlanInput,
  CreateProjectInput,
  CreateTaskInput,
  CredentialDto,
  DashboardDto,
  GitAccountDto,
  GitDashboardDto,
  IssueDto,
  PlanDto,
  ProjectDto,
  PullRequestDto,
  TaskDto,
  UpdateAgentProfileInput,
  UpdateContextItemInput,
  UpdateContextPackInput,
  UpdateCredentialInput,
  UpdateGitAccountInput,
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

type HostListResponse<T> = { items: T[]; error?: string };

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

  // Agents
  getAgentProfiles: () => request<AgentProfileDto[]>("/agent-profiles"),
  createAgentProfile: (input: CreateAgentProfileInput) => request<AgentProfileDto>("/agent-profiles", { method: "POST", body: JSON.stringify(input) }),
  updateAgentProfile: (id: string, input: UpdateAgentProfileInput) =>
    request<AgentProfileDto>(`/agent-profiles/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteAgentProfile: (id: string) => request<void>(`/agent-profiles/${id}`, { method: "DELETE" }),
  getAgentRuns: (projectId: string) => request<AgentRunWithDiffDto[]>(`/agent-runs?projectId=${projectId}`),
  runAgent: (input: CreateAgentRunInput) => request<AgentRunDto>("/agent-runs", { method: "POST", body: JSON.stringify(input) }),

  // Credentials (secrets are write-only; only masked previews are returned)
  getCredentials: () => request<CredentialDto[]>("/credentials"),
  createCredential: (input: CreateCredentialInput) => request<CredentialDto>("/credentials", { method: "POST", body: JSON.stringify(input) }),
  updateCredential: (id: string, input: UpdateCredentialInput) =>
    request<CredentialDto>(`/credentials/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCredential: (id: string) => request<void>(`/credentials/${id}`, { method: "DELETE" }),

  // Git accounts + host data
  getGitAccounts: () => request<GitAccountDto[]>("/git-accounts"),
  createGitAccount: (input: CreateGitAccountInput) => request<GitAccountDto>("/git-accounts", { method: "POST", body: JSON.stringify(input) }),
  updateGitAccount: (id: string, input: UpdateGitAccountInput) =>
    request<GitAccountDto>(`/git-accounts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteGitAccount: (id: string) => request<void>(`/git-accounts/${id}`, { method: "DELETE" }),
  getDashboard: (projectId: string) => request<DashboardDto>(`/dashboard/${projectId}`),
  getGitDashboard: (projectId: string) => request<GitDashboardDto>(`/git/${projectId}`),
  getPullRequests: (projectId: string) => request<HostListResponse<PullRequestDto>>(`/git/${projectId}/pull-requests`),
  getIssues: (projectId: string) => request<HostListResponse<IssueDto>>(`/git/${projectId}/issues`),
};

/**
 * Subscribes to a run's live output over SSE. Auto-closes on the terminal
 * `done`/`error` event (preventing EventSource auto-reconnect). Returns an
 * unsubscribe function for early teardown.
 */
export function streamAgentRun(
  runId: string,
  handlers: { onEvent: (event: AgentRunEvent) => void; onClose?: () => void },
): () => void {
  const source = new EventSource(`${API_URL}/agent-runs/${runId}/stream`);

  const close = () => {
    source.close();
    handlers.onClose?.();
  };

  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as AgentRunEvent;
      handlers.onEvent(event);
      if (event.type === "done" || event.type === "error") close();
    } catch {
      // ignore keep-alive / malformed frames
    }
  };

  source.onerror = () => close();

  return () => source.close();
}
