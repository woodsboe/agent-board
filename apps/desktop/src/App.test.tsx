import { describe, expect, it } from "vitest";
import { nextStatus } from "./task-status";

describe("kanban helpers", () => {
  it("moves right until the final column", () => {
    expect(nextStatus("Backlog")).toBe("Ready");
    expect(nextStatus("Done")).toBe("Done");
  });
});
