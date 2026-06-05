import type { ChipTone } from "@agentboard/ui";
import type { AgentRunStatus, TaskPriority, TaskStatus } from "@agentboard/domain";

export const statusTone: Record<TaskStatus, ChipTone> = {
  Backlog: "neutral",
  Ready: "info",
  Running: "accent",
  Review: "warning",
  Blocked: "negative",
  Done: "positive",
};

export const priorityTone: Record<TaskPriority, ChipTone> = {
  Low: "neutral",
  Medium: "info",
  High: "warning",
  Critical: "negative",
};

export const runStatusTone: Record<AgentRunStatus, ChipTone> = {
  Queued: "neutral",
  Running: "accent",
  Completed: "positive",
  Failed: "negative",
};

export const providerLabel: Record<string, string> = {
  mock: "Mock",
  anthropic: "Anthropic",
  openai: "OpenAI",
  "openai-compatible": "Local (OpenAI-compatible)",
  "claude-cli": "Claude CLI",
  "codex-cli": "Codex CLI",
};

export function formatProvider(provider: string): string {
  return providerLabel[provider] ?? provider;
}
