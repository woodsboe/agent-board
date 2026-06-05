import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  ActionMenu,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Form,
  Heading,
  Item,
  Meter,
  Picker,
  SearchField,
  TabList,
  TabPanels,
  Tabs,
  Text,
  TextArea,
  TextField,
  View,
  Well,
} from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskPriorities, taskStatuses, type TaskPriority, type TaskStatus } from "@agentboard/domain";
import type { AgentRunDto, TaskDto } from "@agentboard/shared";
import { Chip, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { LiveRunOutput, useRunStream } from "../components/run-stream";
import { useAppStore } from "../store";
import { nextStatus, previousStatus } from "../task-status";
import { buildTaskRunSummary, type TaskRunSummary } from "../task-run-summary";
import { priorityTone, runStatusTone, statusTone } from "../task-presentation";
import { useProjectId } from "../use-project-id";
import "./tasks-page.css";

type TaskFormState = {
  mode: "create" | "edit";
  taskId: string | null;
  title: string;
  description: string;
  planId: string | null;
  assignedAgentProfileId: string | null;
  contextPackId: string | null;
  priority: TaskPriority;
};

const emptyForm = (): TaskFormState => ({
  mode: "create",
  taskId: null,
  title: "",
  description: "",
  planId: null,
  assignedAgentProfileId: null,
  contextPackId: null,
  priority: "Medium",
});

export function TasksPage(props: { onSelectTask: (id: string | null) => void }) {
  const projectId = useProjectId();
  const selectedTaskId = useAppStore((state) => state.selectedTaskId);
  const detailPanelWidth = useAppStore((state) => state.detailPanelWidth);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({ queryKey: ["tasks", projectId], queryFn: () => api.getTasks(projectId!), enabled: Boolean(projectId) });
  const plansQuery = useQuery({ queryKey: ["plans", projectId], queryFn: () => api.getPlans(projectId!), enabled: Boolean(projectId) });
  const profilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const packsQuery = useQuery({ queryKey: ["context-packs", projectId], queryFn: () => api.getContextPacks(projectId!), enabled: Boolean(projectId) });
  const itemsQuery = useQuery({ queryKey: ["context-items", projectId], queryFn: () => api.getContextItems(projectId!), enabled: Boolean(projectId) });
  const runsQuery = useQuery({ queryKey: ["agent-runs", projectId], queryFn: () => api.getAgentRuns(projectId!), enabled: Boolean(projectId) });

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  const createTask = useMutation({ mutationFn: api.createTask, onSuccess: invalidateTasks });
  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskDto> }) => api.updateTask(id, data),
    onSuccess: invalidateTasks,
  });
  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      invalidateTasks();
      props.onSelectTask(null);
    },
  });
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const runAgent = useMutation({
    mutationFn: api.runAgent,
    onSuccess: (run) => {
      setActiveRunId(run.id);
      props.onSelectTask(run.taskId);
      setDrawerTab("runs");
    },
  });

  const [form, setForm] = useState<TaskFormState | null>(null);
  const [quickEdit, setQuickEdit] = useState<{
    status: TaskStatus;
    priority: TaskPriority;
    assignedAgentProfileId: string | null;
    contextPackId: string | null;
  } | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [drawerTab, setDrawerTab] = useState<string>("overview");

  const tasks = tasksQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const packs = packsQuery.data ?? [];
  const contextItems = itemsQuery.data ?? [];
  const agentRuns = runsQuery.data ?? [];

  const planOptions = [{ id: "none", name: "No plan" }, ...plans.map((plan) => ({ id: plan.id, name: plan.title }))];
  const profileOptions = [{ id: "none", name: "Unassigned" }, ...profiles.map((profile) => ({ id: profile.id, name: profile.name }))];
  const packOptions = [{ id: "none", name: "No pack" }, ...packs.map((pack) => ({ id: pack.id, name: pack.name }))];
  const priorityOptions = taskPriorities.map((priority) => ({ id: priority, name: priority }));
  const agentLabels = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p.name])), [profiles]);

  const detailPanelWidthValue = detailPanelWidth === "wide" ? 480 : 380;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedPack = packs.find((pack) => pack.id === selectedTask?.contextPackId) ?? null;
  const selectedContextItems = selectedPack ? contextItems.filter((item) => selectedPack.itemIds.includes(item.id)) : [];
  const taskRunSummary = useMemo(() => buildTaskRunSummary(tasks, agentRuns), [tasks, agentRuns]);
  const selectedTaskRuns = selectedTask
    ? agentRuns.filter((run) => run.taskId === selectedTask.id).slice(0, 6)
    : [];

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.description}`.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const stream = useRunStream(activeRunId, () => {
    queryClient.invalidateQueries({ queryKey: ["agent-runs", projectId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  });

  useEffect(() => {
    if (!selectedTask) {
      setQuickEdit(null);
      return;
    }
    setQuickEdit({
      status: selectedTask.status,
      priority: selectedTask.priority,
      assignedAgentProfileId: selectedTask.assignedAgentProfileId ?? null,
      contextPackId: selectedTask.contextPackId ?? null,
    });
  }, [selectedTask]);

  function openCreate() {
    setForm(emptyForm());
  }

  function openEdit(task: TaskDto) {
    setForm({
      mode: "edit",
      taskId: task.id,
      title: task.title,
      description: task.description,
      planId: task.planId ?? null,
      assignedAgentProfileId: task.assignedAgentProfileId ?? null,
      contextPackId: task.contextPackId ?? null,
      priority: task.priority,
    });
  }

  function submitForm() {
    if (!form || !projectId) return;
    const payload = {
      projectId,
      title: form.title,
      description: form.description,
      priority: form.priority,
      planId: form.planId,
      parentTaskId: null,
      assignedAgentProfileId: form.assignedAgentProfileId,
      contextPackId: form.contextPackId,
    };
    if (form.mode === "edit" && form.taskId) {
      const existing = tasks.find((task) => task.id === form.taskId);
      updateTask.mutate({ id: form.taskId, data: { ...payload, status: existing?.status ?? "Backlog" } });
    } else {
      createTask.mutate({ ...payload, status: "Backlog" });
    }
    setForm(null);
  }

  function startRun(task: TaskDto) {
    if (!projectId || !task.assignedAgentProfileId) return;
    runAgent.mutate({ projectId, taskId: task.id, agentProfileId: task.assignedAgentProfileId });
  }

  if (!projectId) return <EmptyState label="No project selected" />;

  const formValid = Boolean(form?.title.trim() && form?.description.trim());

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader
        title="Tasks"
        description="Drag cards between lanes, or press ← / → on a focused card."
        actions={
          <Button variant="accent" onPress={openCreate}>
            New Task
          </Button>
        }
      />

      <Flex gap="size-150" wrap alignItems="end">
        <SearchField aria-label="Search tasks" label="Search" value={taskSearch} onChange={setTaskSearch} width="size-3000" />
        <Picker
          label="Priority"
          items={[{ id: "All", name: "All priorities" }, ...priorityOptions]}
          selectedKey={priorityFilter}
          onSelectionChange={(key) => setPriorityFilter(String(key))}
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </Picker>
        <Content marginBottom="size-100">{filteredTasks.length} of {tasks.length} tasks</Content>
      </Flex>

      <Flex gap="size-200" alignItems="start">
        <View flex minWidth={0}>
          <div className="kanban-board">
            {taskStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredTasks.filter((task) => task.status === status)}
                agentLabels={agentLabels}
                runSummary={taskRunSummary}
                selectedTaskId={selectedTaskId}
                isDropTarget={dragOverColumn === status}
                onDragOverColumn={setDragOverColumn}
                onDropTask={(taskId, nextColumn) => updateTask.mutate({ id: taskId, data: { status: nextColumn } })}
                onSelectTask={(id) => props.onSelectTask(id)}
                onRun={startRun}
                onEdit={openEdit}
                onDelete={(id) => deleteTask.mutate(id)}
                onMove={(taskId, nextColumn) => updateTask.mutate({ id: taskId, data: { status: nextColumn } })}
              />
            ))}
          </div>
        </View>

        <View width={detailPanelWidthValue} minWidth={detailPanelWidthValue} UNSAFE_className="detail-panel">
          <SurfaceCard
            title="Task Detail"
            actions={selectedTask ? <Button variant="secondary" onPress={() => props.onSelectTask(null)}>Close</Button> : undefined}
          >
            {selectedTask ? (
              <Flex direction="column" gap="size-150">
                <View>
                  <Heading level={4} margin={0}>{selectedTask.title}</Heading>
                  <Flex gap="size-75" marginTop="size-100" wrap>
                    <Chip label={selectedTask.status} tone={statusTone[selectedTask.status]} />
                    <Chip label={`${selectedTask.priority} priority`} tone={priorityTone[selectedTask.priority]} />
                  </Flex>
                </View>

                <Tabs aria-label="Task detail" selectedKey={drawerTab} onSelectionChange={(key) => setDrawerTab(String(key))}>
                  <TabList>
                    <Item key="overview">Overview</Item>
                    <Item key="context">Context</Item>
                    <Item key="runs">Runs</Item>
                  </TabList>
                  <TabPanels>
                    <Item key="overview">
                      <Flex direction="column" gap="size-100" marginTop="size-100">
                        <Content>{selectedTask.description}</Content>
                        <Content>Plan: {plans.find((plan) => plan.id === selectedTask.planId)?.title ?? "No plan"}</Content>
                        {quickEdit ? (
                          <Form>
                            <Picker label="Status" items={taskStatuses.map((s) => ({ id: s, name: s }))} selectedKey={quickEdit.status} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, status: String(key) as TaskStatus })}>
                              {(item) => <Item key={item.id}>{item.name}</Item>}
                            </Picker>
                            <Picker label="Priority" items={priorityOptions} selectedKey={quickEdit.priority} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, priority: String(key) as TaskPriority })}>
                              {(item) => <Item key={item.id}>{item.name}</Item>}
                            </Picker>
                            <Picker label="Assigned Agent" items={profileOptions} selectedKey={quickEdit.assignedAgentProfileId ?? "none"} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, assignedAgentProfileId: key === "none" ? null : String(key) })}>
                              {(item) => <Item key={item.id}>{item.name}</Item>}
                            </Picker>
                            <Picker label="Context Pack" items={packOptions} selectedKey={quickEdit.contextPackId ?? "none"} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, contextPackId: key === "none" ? null : String(key) })}>
                              {(item) => <Item key={item.id}>{item.name}</Item>}
                            </Picker>
                          </Form>
                        ) : null}
                        <ButtonGroup>
                          <Button
                            variant="primary"
                            onPress={() => {
                              if (!quickEdit) return;
                              updateTask.mutate({ id: selectedTask.id, data: { ...quickEdit } });
                            }}
                          >
                            Save
                          </Button>
                          <Button variant="secondary" onPress={() => openEdit(selectedTask)}>Edit details</Button>
                          <Button variant="negative" onPress={() => deleteTask.mutate(selectedTask.id)}>Delete</Button>
                        </ButtonGroup>
                      </Flex>
                    </Item>

                    <Item key="context">
                      <Flex direction="column" gap="size-100" marginTop="size-100">
                        <Content>Context Pack: {selectedPack?.name ?? "None attached"}</Content>
                        {selectedPack ? (
                          <Meter
                            label={`Budget: ${selectedPack.currentTokens} / ${selectedPack.tokenBudget} tokens`}
                            value={selectedPack.currentTokens}
                            maxValue={Math.max(selectedPack.tokenBudget, 1)}
                            variant={selectedPack.remainingTokens < 0 ? "critical" : "informative"}
                          />
                        ) : null}
                        {selectedContextItems.length ? (
                          selectedContextItems.map((item) => (
                            <Well key={item.id}>
                              <Text>{item.title}</Text>
                              <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                              <Content>{item.summary}</Content>
                            </Well>
                          ))
                        ) : (
                          <Content>No context items attached to this task.</Content>
                        )}
                      </Flex>
                    </Item>

                    <Item key="runs">
                      <Flex direction="column" gap="size-150" marginTop="size-100">
                        <Button
                          variant="accent"
                          isDisabled={!selectedTask.assignedAgentProfileId || stream.isStreaming}
                          onPress={() => startRun(selectedTask)}
                        >
                          {stream.isStreaming ? "Running…" : "Run Agent"}
                        </Button>
                        {!selectedTask.assignedAgentProfileId ? (
                          <Content>Assign an agent profile to run this task.</Content>
                        ) : null}
                        {activeRunId ? <LiveRunOutput output={stream.output} status={stream.status} error={stream.error} /> : null}
                        <Divider size="S" />
                        <Heading level={5} margin={0}>Recent runs</Heading>
                        {selectedTaskRuns.length ? (
                          selectedTaskRuns.map((run) => (
                            <Well key={run.id}>
                              <Flex justifyContent="space-between" alignItems="center">
                                <Chip label={run.status} tone={runStatusTone[run.status]} />
                                <Content>{new Date(run.startedAt).toLocaleString()}</Content>
                              </Flex>
                              <Content>Tokens: {run.tokenUsage?.totalTokens ?? 0} • Cost: ${run.tokenUsage?.estimatedCost ?? 0}</Content>
                              <Content>{run.output.split("\n")[0]}</Content>
                            </Well>
                          ))
                        ) : (
                          <Content>No runs recorded for this task yet.</Content>
                        )}
                      </Flex>
                    </Item>
                  </TabPanels>
                </Tabs>
              </Flex>
            ) : (
              <Content>Select a task card to inspect its context and run an agent.</Content>
            )}
          </SurfaceCard>
        </View>
      </Flex>

      <DialogContainer onDismiss={() => setForm(null)}>
        {form ? (
          <Dialog>
            <Heading>{form.mode === "edit" ? "Edit Task" : "New Task"}</Heading>
            <Divider />
            <Content>
              <Form>
                <TextField label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} autoFocus />
                <TextArea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                <Picker label="Plan" items={planOptions} selectedKey={form.planId ?? "none"} onSelectionChange={(key) => setForm({ ...form, planId: key === "none" ? null : String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <Picker label="Agent Profile" items={profileOptions} selectedKey={form.assignedAgentProfileId ?? "none"} onSelectionChange={(key) => setForm({ ...form, assignedAgentProfileId: key === "none" ? null : String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <Picker label="Context Pack" items={packOptions} selectedKey={form.contextPackId ?? "none"} onSelectionChange={(key) => setForm({ ...form, contextPackId: key === "none" ? null : String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <Picker label="Priority" items={priorityOptions} selectedKey={form.priority} onSelectionChange={(key) => setForm({ ...form, priority: String(key) as TaskPriority })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setForm(null)}>Cancel</Button>
              <Button variant="accent" isDisabled={!formValid} onPress={submitForm}>
                {form.mode === "edit" ? "Save Task" : "Create Task"}
              </Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </Flex>
  );
}

export function KanbanColumn(props: {
  status: TaskStatus;
  tasks: TaskDto[];
  agentLabels: Record<string, string>;
  runSummary: Record<string, TaskRunSummary>;
  selectedTaskId: string | null;
  isDropTarget: boolean;
  onDragOverColumn: (status: TaskStatus | null) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (taskId: string) => void;
  onRun: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
  onDelete: (taskId: string) => void;
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
}) {
  return (
    <div
      className={`kanban-column${props.isDropTarget ? " is-drop-target" : ""}`}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        props.onDragOverColumn(props.status);
      }}
      onDragLeave={() => props.onDragOverColumn(null)}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/task-id");
        props.onDragOverColumn(null);
        if (taskId) props.onDropTask(taskId, props.status);
      }}
    >
      <div className="kanban-column__header">
        <span>{props.status}</span>
        <span className="kanban-column__count">{props.tasks.length}</span>
      </div>

      {props.tasks.map((task) => {
        const summary = props.runSummary[task.id];
        const isSelected = props.selectedTaskId === task.id;
        const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            props.onMove(task.id, previousStatus(task.status));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            props.onMove(task.id, nextStatus(task.status));
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onSelectTask(task.id);
          } else if (event.key.toLowerCase() === "r") {
            event.preventDefault();
            props.onRun(task);
          }
        };

        return (
          <div
            key={task.id}
            className={`task-card${isSelected ? " is-selected" : ""}`}
            draggable
            onDragStart={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData("text/task-id", task.id)}
            onClick={() => props.onSelectTask(task.id)}
            onKeyDown={onKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${task.title} task card`}
          >
            <Flex justifyContent="space-between" alignItems="start" gap="size-100">
              <span className="task-card__title">{task.title}</span>
              <ActionMenu
                aria-label={`Actions for ${task.title}`}
                isQuiet
                onAction={(key) => {
                  if (key === "open") props.onSelectTask(task.id);
                  if (key === "run") props.onRun(task);
                  if (key === "edit") props.onEdit(task);
                  if (key === "left") props.onMove(task.id, previousStatus(task.status));
                  if (key === "right") props.onMove(task.id, nextStatus(task.status));
                  if (key === "delete") props.onDelete(task.id);
                }}
              >
                <Item key="open">Open details</Item>
                <Item key="run">Run agent</Item>
                <Item key="edit">Edit task</Item>
                <Item key="left">Move left</Item>
                <Item key="right">Move right</Item>
                <Item key="delete">Delete task</Item>
              </ActionMenu>
            </Flex>

            <div className="task-card__chips">
              <Chip label={task.priority} tone={priorityTone[task.priority]} />
              {task.assignedAgentProfileId ? (
                <Chip label={props.agentLabels[task.assignedAgentProfileId] ?? "Assigned"} tone="info" />
              ) : (
                <Chip label="Unassigned" tone="neutral" />
              )}
              {summary?.latestRun ? (
                <Chip label={summary.latestRun.status} tone={runStatusTone[summary.latestRun.status]} />
              ) : null}
            </div>

            <div className="task-card__meta">
              {summary?.runCount ?? 0} run{(summary?.runCount ?? 0) === 1 ? "" : "s"} • {summary?.totalTokens ?? 0} tokens
            </div>
          </div>
        );
      })}

      {!props.tasks.length ? <Content>Drop tasks here.</Content> : null}
    </div>
  );
}
