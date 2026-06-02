import { describe, expect, it } from "vitest";
import { diffContextSnapshots } from "./index";

describe("diffContextSnapshots", () => {
  it("detects added, removed, and modified items", () => {
    const previous = [
      { id: "a", title: "architecture.md", tokenEstimate: 10, updatedAt: "2026-06-01T00:00:00.000Z" },
      { id: "b", title: "legacy.md", tokenEstimate: 5, updatedAt: "2026-06-01T00:00:00.000Z" },
    ];
    const current = [
      { id: "a", title: "architecture.md", tokenEstimate: 12, updatedAt: "2026-06-02T00:00:00.000Z" },
      { id: "c", title: "api.md", tokenEstimate: 8, updatedAt: "2026-06-02T00:00:00.000Z" },
    ];

    const diff = diffContextSnapshots(previous, current);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.modified).toHaveLength(1);
  });
});
