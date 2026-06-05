import type { ContextSnapshotItem, GitHost } from "@agentboard/domain";
import type { GitDashboardDto, IssueDto, PullRequestDto } from "@agentboard/shared";

/** Token accounting returned by an adapter — real when the runtime reports it, estimated otherwise. */
export type AgentTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
};

/** Everything an adapter needs to execute one run. Credentials arrive already decrypted. */
export type AgentRunInput = {
  provider: string;
  model: string;
  systemPrompt: string;
  baseUrl: string | null;
  temperature: number | null;
  maxTokens: number | null;
  apiKey: string | null;
  prompt: string;
  contextSnapshot: ContextSnapshotItem[];
  repositoryPath: string;
};

export type AgentRunResult = {
  status: "Completed" | "Failed";
  output: string;
  error?: string;
  tokenUsage: AgentTokenUsage;
};

/** Called with each incremental piece of model output so the UI can stream it live. */
export type AgentChunkHandler = (text: string) => void;

/**
 * Pluggable agent runtime. Every backend — hosted API, local CLI, or mock —
 * implements this one method. Adapters resolve their own errors into a Failed
 * result wherever possible rather than throwing.
 */
export interface AgentAdapter {
  runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult>;
}

/** A resolved Git identity + host connection, with the PAT already decrypted. */
export type GitAccountInfo = {
  id: string;
  name: string;
  host: GitHost;
  authorName: string;
  authorEmail: string;
  apiBaseUrl: string | null;
  remoteUrl: string | null;
  token: string | null;
};

export interface GitService {
  inspectRepository(repositoryPath: string, account: GitAccountInfo | null): Promise<GitDashboardDto>;
  listPullRequests(repositoryPath: string, account: GitAccountInfo): Promise<PullRequestDto[]>;
  listIssues(repositoryPath: string, account: GitAccountInfo): Promise<IssueDto[]>;
}
