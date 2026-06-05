import { describe, expect, it } from "vitest";
import type { AgentProfile, Credential } from "@prisma/client";
import { mapAgentProfile, mapCredential } from "./mappers";

describe("mappers", () => {
  it("mapCredential exposes only the masked preview, never ciphertext", () => {
    const row = {
      id: "c1",
      name: "Anthropic Key",
      kind: "provider_api_key",
      provider: "anthropic",
      encrypted: "iv:tag:ciphertext",
      preview: "sk-a…wxyz",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    } as Credential;

    const dto = mapCredential(row);
    expect(dto).not.toHaveProperty("encrypted");
    expect(dto.preview).toBe("sk-a…wxyz");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("mapAgentProfile normalizes nullable fields and serializes dates", () => {
    const row = {
      id: "p1",
      name: "Claude Sonnet",
      description: "d",
      systemPrompt: "s",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      runtimeKind: "api",
      credentialId: null,
      baseUrl: null,
      temperature: null,
      maxTokens: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as AgentProfile;

    const dto = mapAgentProfile(row);
    expect(dto.credentialId).toBeNull();
    expect(dto.provider).toBe("anthropic");
    expect(dto.runtimeKind).toBe("api");
    expect(typeof dto.createdAt).toBe("string");
  });
});
