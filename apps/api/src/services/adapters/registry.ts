import type { AgentAdapter } from "@agentboard/services";
import { AnthropicApiAdapter } from "./anthropic-api";
import { ClaudeCliAdapter } from "./claude-cli";
import { CodexCliAdapter } from "./codex-cli";
import { MockAdapter } from "./mock";
import { OpenAiApiAdapter } from "./openai-api";

export type ResolvedAdapter = {
  adapter: AgentAdapter;
  /** The runtime that actually ran — may differ from the requested provider when we fall back to mock. */
  effectiveProvider: string;
};

/**
 * Picks the adapter for a profile's provider. API providers without a usable
 * credential (or local providers without a base URL) transparently fall back to
 * the mock runtime so a run never hard-fails purely for lack of configuration.
 */
export function resolveAdapter(provider: string, apiKey: string | null, baseUrl: string | null): ResolvedAdapter {
  switch (provider) {
    case "anthropic":
      return apiKey
        ? { adapter: new AnthropicApiAdapter(), effectiveProvider: "anthropic" }
        : { adapter: new MockAdapter("No Anthropic credential connected — simulating with the mock runtime."), effectiveProvider: "mock" };
    case "openai":
      return apiKey
        ? { adapter: new OpenAiApiAdapter(), effectiveProvider: "openai" }
        : { adapter: new MockAdapter("No OpenAI credential connected — simulating with the mock runtime."), effectiveProvider: "mock" };
    case "openai-compatible":
      return baseUrl
        ? { adapter: new OpenAiApiAdapter(), effectiveProvider: "openai-compatible" }
        : { adapter: new MockAdapter("No base URL configured for the local model — simulating with the mock runtime."), effectiveProvider: "mock" };
    case "claude-cli":
      return { adapter: new ClaudeCliAdapter(), effectiveProvider: "claude-cli" };
    case "codex-cli":
      return { adapter: new CodexCliAdapter(), effectiveProvider: "codex-cli" };
    case "mock":
    default:
      return { adapter: new MockAdapter(), effectiveProvider: "mock" };
  }
}
