import { fireEvent, render, screen } from "@testing-library/react";
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
    Meter: wrap("Meter"),
    Picker: wrap("Picker"),
    ProgressCircle: wrap("ProgressCircle"),
    SearchField: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => <input aria-label={ariaLabel} />,
    TabList: wrap("TabList"),
    TabPanels: wrap("TabPanels"),
    Tabs: wrap("Tabs"),
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    TextArea: wrap("TextArea"),
    TextField: wrap("TextField"),
    View: wrap("View"),
    Well: wrap("Well"),
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
    runSummary: { "task-1": { latestRun: null, runCount: 0, totalTokens: 0, totalCost: 0 } },
    selectedTaskId: null,
    isDropTarget: false,
    onDragOverColumn: vi.fn(),
    onDropTask: vi.fn(),
    onSelectTask: vi.fn(),
    onRun: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<KanbanColumn {...props} />) };
}

describe("KanbanColumn", () => {
  it("renders the task with its priority and assigned agent", () => {
    renderColumn();
    expect(screen.getByText("Backlog Task")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("selects a task when its card is clicked", () => {
    const onSelectTask = vi.fn();
    renderColumn({ onSelectTask });
    fireEvent.click(screen.getByLabelText("Backlog Task task card"));
    expect(onSelectTask).toHaveBeenCalledWith("task-1");
  });

  it("moves a task to the next lane with the right-arrow key", () => {
    const onMove = vi.fn();
    renderColumn({ onMove });
    fireEvent.keyDown(screen.getByLabelText("Backlog Task task card"), { key: "ArrowRight" });
    expect(onMove).toHaveBeenCalledWith("task-1", "Ready");
  });
});
