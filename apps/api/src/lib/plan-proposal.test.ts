import { describe, expect, it } from "vitest";
import { buildGenerationPrompt, extractProposal, mockPlanProposal } from "./plan-proposal";

const validJson = JSON.stringify({
  title: "Add login",
  summary: "Add email login",
  items: [
    { title: "Schema", description: "Add users table", priority: "High" },
    { title: "API", description: "Add endpoints", priority: "Medium" },
  ],
});

describe("extractProposal", () => {
  it("parses a bare JSON object", () => {
    const proposal = extractProposal(validJson);
    expect(proposal?.title).toBe("Add login");
    expect(proposal?.items).toHaveLength(2);
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const proposal = extractProposal("Here is your plan:\n```json\n" + validJson + "\n```\nThanks!");
    expect(proposal?.items[0].title).toBe("Schema");
  });

  it("recovers JSON embedded in surrounding prose", () => {
    const proposal = extractProposal(`Sure! ${validJson} Let me know if you want changes.`);
    expect(proposal?.summary).toBe("Add email login");
  });

  it("returns null for prose with no JSON", () => {
    expect(extractProposal("I think we should start by adding a users table.")).toBeNull();
  });

  it("returns null when the JSON fails schema validation (no items)", () => {
    expect(extractProposal(JSON.stringify({ title: "x", summary: "y", items: [] }))).toBeNull();
  });

  it("returns null for an invalid priority value", () => {
    const bad = JSON.stringify({ title: "x", summary: "y", items: [{ title: "a", description: "b", priority: "Urgent" }] });
    expect(extractProposal(bad)).toBeNull();
  });
});

describe("mockPlanProposal", () => {
  it("produces a valid, convertible structured plan from a goal", () => {
    const proposal = mockPlanProposal("Add passwordless login.");
    expect(proposal.items.length).toBeGreaterThanOrEqual(3);
    // The mock output must itself pass the proposal schema (round-trips through extractProposal).
    expect(extractProposal(JSON.stringify(proposal))).not.toBeNull();
  });

  it("handles an empty goal without throwing", () => {
    expect(() => mockPlanProposal("")).not.toThrow();
    expect(mockPlanProposal("").items.length).toBeGreaterThan(0);
  });
});

describe("buildGenerationPrompt", () => {
  it("includes only the goal on the first turn", () => {
    const prompt = buildGenerationPrompt("Add login", []);
    expect(prompt).toContain("Goal: Add login");
    expect(prompt).not.toContain("Refinement so far");
  });

  it("includes prior draft and requested change on a refine turn", () => {
    const prompt = buildGenerationPrompt("Add login", [
      { role: "assistant", content: validJson },
      { role: "user", content: "Split the API task" },
    ]);
    expect(prompt).toContain("Refinement so far");
    expect(prompt).toContain("Previous draft (JSON)");
    expect(prompt).toContain("Requested change: Split the API task");
  });
});
