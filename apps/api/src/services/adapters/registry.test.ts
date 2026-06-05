import { describe, expect, it } from "vitest";
import { resolveAdapter } from "./registry";
import { MockAdapter } from "./mock";
import type { AgentRunInput } from "@agentboard/services";

const baseInput: AgentRunInput = {
  provider: "mock",
  model: "test",
  systemPrompt: "system",
  baseUrl: null,
  temperature: null,
  maxTokens: null,
  apiKey: null,
  prompt: "do the thing",
  contextSnapshot: [{ id: "c1", title: "doc", tokenEstimate: 100, updatedAt: "2026-01-01T00:00:00.000Z" }],
  repositoryPath: ".",
};

describe("resolveAdapter", () => {
  it("falls back to mock for an API provider with no credential", () => {
    const { adapter, effectiveProvider } = resolveAdapter("anthropic", null, null);
    expect(effectiveProvider).toBe("mock");
    expect(adapter).toBeInstanceOf(MockAdapter);
  });

  it("uses the real adapter when a credential is present", () => {
    expect(resolveAdapter("anthropic", "key", null).effectiveProvider).toBe("anthropic");
    expect(resolveAdapter("openai", "key", null).effectiveProvider).toBe("openai");
  });

  it("treats openai-compatible as runnable when a base URL is set", () => {
    expect(resolveAdapter("openai-compatible", null, "http://localhost:11434/v1").effectiveProvider).toBe("openai-compatible");
    expect(resolveAdapter("openai-compatible", null, null).effectiveProvider).toBe("mock");
  });

  it("always resolves the CLI adapters (no credential required)", () => {
    expect(resolveAdapter("claude-cli", null, null).effectiveProvider).toBe("claude-cli");
    expect(resolveAdapter("codex-cli", null, null).effectiveProvider).toBe("codex-cli");
  });
});

describe("MockAdapter", () => {
  it("streams chunks and reports completed with token usage", async () => {
    const chunks: string[] = [];
    const result = await new MockAdapter().runTask(baseInput, (text) => chunks.push(text));

    expect(result.status).toBe("Completed");
    expect(chunks.length).toBeGreaterThan(0);
    expect(result.output).toContain("Review required");
    expect(result.tokenUsage.totalTokens).toBe(result.tokenUsage.promptTokens + result.tokenUsage.completionTokens);
    expect(result.tokenUsage.promptTokens).toBeGreaterThanOrEqual(400); // 300 base + 100 context
  });
});
