import { describe, expect, it } from "vitest";
import { canDropLiftedTask, toggleLiftedTask } from "./task-move-mode";

describe("task move mode helpers", () => {
  it("toggles the lifted task on and off", () => {
    expect(toggleLiftedTask(null, "task-1")).toBe("task-1");
    expect(toggleLiftedTask("task-1", "task-1")).toBeNull();
    expect(toggleLiftedTask("task-1", "task-2")).toBe("task-2");
  });

  it("only allows drop targets in different lanes", () => {
    expect(canDropLiftedTask(null, null, "Backlog")).toBe(false);
    expect(canDropLiftedTask("task-1", "Backlog", "Backlog")).toBe(false);
    expect(canDropLiftedTask("task-1", "Backlog", "Ready")).toBe(true);
  });
});
