import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TaskDto } from "@agentboard/shared";

vi.mock("@adobe/react-spectrum", () => {
  function wrap(name: string, defaultRole = "generic") {
    return function MockComponent(props: { children?: ReactNode; onPress?: () => void; "aria-label"?: string }) {
      if (name === "Button" || name === "ActionButton") {
        return (
          <button aria-label={props["aria-label"]} onClick={props.onPress}>
            {props.children}
          </button>
        );
      }

      if (name === "ActionMenu") {
        return <div aria-label={props["aria-label"]}>{props.children}</div>;
      }

      if (name === "Picker") {
        return <button aria-label={props["aria-label"]} />;
      }

      return <div role={defaultRole}>{props.children}</div>;
    };
  }

  return {
    ActionMenu: wrap("ActionMenu"),
    ActionButton: wrap("ActionButton"),
    Button: wrap("Button"),
    ButtonGroup: wrap("ButtonGroup"),
    Content: wrap("Content"),
    Dialog: wrap("Dialog"),
    DialogContainer: wrap("DialogContainer"),
    Divider: wrap("Divider", "separator"),
    Flex: wrap("Flex"),
    Form: wrap("Form", "form"),
    Heading: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
    Item: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    ListBox: wrap("ListBox", "listbox"),
    SearchField: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => <input aria-label={ariaLabel} />,
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    TextArea: wrap("TextArea"),
    TextField: wrap("TextField"),
    View: wrap("View"),
    Well: wrap("Well"),
    IllustratedMessage: wrap("IllustratedMessage"),
    ProgressCircle: wrap("ProgressCircle"),
    TableView: wrap("TableView"),
    TableHeader: wrap("TableHeader"),
    TableBody: wrap("TableBody"),
    Column: wrap("Column"),
    Row: wrap("Row"),
    Cell: wrap("Cell"),
    Meter: wrap("Meter"),
    Picker: wrap("Picker"),
    ProgressBar: wrap("ProgressBar"),
  };
});

import { KanbanColumn } from "./App";

function renderColumn(overrides?: Partial<ComponentProps<typeof KanbanColumn>>) {
  const task: TaskDto = {
    id: "task-1",
    projectId: "project-1",
    title: "Backlog Task",
    description: "Sample task in Backlog column.",
    status: "Backlog",
    priority: "High",
    planId: null,
    parentTaskId: null,
    assignedAgentProfileId: "agent-1",
    contextPackId: "pack-1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  };

  const props: ComponentProps<typeof KanbanColumn> = {
    status: "Backlog",
    tasks: [task],
    agentLabels: { "agent-1": "Frontend Engineer" },
    packLabels: { "pack-1": "Zustand Migration Pack" },
    runSummary: {
      "task-1": {
        latestRun: null,
        runCount: 0,
        totalTokens: 0,
        totalCost: 0,
      },
    },
    liftedTaskId: null,
    liftedTaskStatus: null,
    onDropTask: vi.fn(),
    onSelectTask: vi.fn(),
    onEditTask: vi.fn(),
    onQuickUpdate: vi.fn(),
    onLiftTask: vi.fn(),
    onDropLiftedTask: vi.fn(),
    onMove: vi.fn(),
    onDeleteTask: vi.fn(),
    onRun: vi.fn(),
    ...overrides,
  };

  return {
    user: userEvent.setup(),
    props,
    ...render(<KanbanColumn {...props} />),
  };
}

describe("KanbanColumn", () => {
  it("hides the drop target when the lifted task is already in the same lane", () => {
    renderColumn({ liftedTaskId: "task-1", liftedTaskStatus: "Backlog" });

    expect(screen.queryByRole("button", { name: "Drop Here" })).not.toBeInTheDocument();
    expect(screen.getByText("This task is in move mode. Choose a different lane drop button or press M again to cancel.")).toBeInTheDocument();
  });

  it("shows the drop target for a lifted task from a different lane", async () => {
    const onDropLiftedTask = vi.fn();
    const { user } = renderColumn({
      liftedTaskId: "task-2",
      liftedTaskStatus: "Ready",
      onDropLiftedTask,
    });

    await user.click(screen.getByRole("button", { name: "Drop Here" }));

    expect(onDropLiftedTask).toHaveBeenCalledWith("task-2");
  });

  it("uses the pick up button to toggle move mode for the task", async () => {
    const onLiftTask = vi.fn();
    const { user } = renderColumn({ onLiftTask });

    await user.click(screen.getAllByRole("button", { name: "Pick Up" })[0]);

    expect(onLiftTask).toHaveBeenCalledWith("task-1");
  });
});
