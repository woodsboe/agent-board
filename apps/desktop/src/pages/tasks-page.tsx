import { useEffect, useState, type DragEvent } from "react";
import {
  ActionButton,
  ActionMenu,
  Button,
  ButtonGroup,
  Content,
  Divider,
  Flex,
  Form,
  Heading,
  Item,
  Picker,
  SearchField,
  Text,
  TextArea,
  TextField,
  View,
  Well,
} from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskPriorities, taskStatuses, type TaskPriority, type TaskStatus } from "@agentboard/domain";
import type { TaskDto } from "@agentboard/shared";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../store";
import { canDropLiftedTask, toggleLiftedTask } from "../task-move-mode";
import { nextStatus, previousStatus } from "../task-status";
import { buildTaskRunSummary, type TaskRunSummary } from "../task-run-summary";
import { useProjectId } from "../use-project-id";
import "./tasks-page.css";

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
  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });
  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskDto> }) => api.updateTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });
  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      props.onSelectTask(null);
    },
  });
  const runAgent = useMutation({
    mutationFn: api.runAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
    },
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    planId: null as string | null,
    assignedAgentProfileId: null as string | null,
    contextPackId: null as string | null,
    priority: "Medium" as TaskPriority,
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<{
    status: TaskStatus;
    priority: TaskPriority;
    assignedAgentProfileId: string | null;
    contextPackId: string | null;
  } | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [boardPriorityFilter, setBoardPriorityFilter] = useState<string>("All");
  const [liftedTaskId, setLiftedTaskId] = useState<string | null>(null);

  const tasks = tasksQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const packs = packsQuery.data ?? [];
  const contextItems = itemsQuery.data ?? [];
  const agentRuns = runsQuery.data ?? [];
  const planOptions = [{ id: "none", name: "No plan" }, ...plans.map((plan) => ({ id: plan.id, name: plan.title }))];
  const profileOptions = [{ id: "none", name: "Unassigned" }, ...profiles.map((profile) => ({ id: profile.id, name: profile.name }))];
  const packOptions = [{ id: "none", name: "No pack" }, ...packs.map((pack) => ({ id: pack.id, name: pack.name }))];
  const statusOptions = taskStatuses.map((status) => ({ id: status, name: status }));
  const priorityOptions = taskPriorities.map((priority) => ({ id: priority, name: priority }));
  const detailPanelWidthValue = detailPanelWidth === "wide" ? 480 : 400;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const liftedTask = tasks.find((task) => task.id === liftedTaskId) ?? null;
  const selectedPack = packs.find((pack) => pack.id === selectedTask?.contextPackId) ?? null;
  const selectedContextItems = selectedPack ? contextItems.filter((item) => selectedPack.itemIds.includes(item.id)) : [];
  const previousSelectedTaskStatus = selectedTask ? previousStatus(selectedTask.status) : null;
  const nextSelectedTaskStatus = selectedTask ? nextStatus(selectedTask.status) : null;
  const selectedTaskRuns = selectedTask
    ? [...agentRuns]
        .filter((run) => run.taskId === selectedTask.id)
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
        .slice(0, 5)
    : [];
  const taskRunSummary = buildTaskRunSummary(tasks, agentRuns);
  const selectedTaskRunSummary = selectedTask ? taskRunSummary[selectedTask.id] : null;
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.description}`.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesPriority = boardPriorityFilter === "All" || task.priority === boardPriorityFilter;
    return matchesSearch && matchesPriority;
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

  function resetTaskForm() {
    setEditingTaskId(null);
    setForm({
      title: "",
      description: "",
      planId: null,
      assignedAgentProfileId: null,
      contextPackId: null,
      priority: "Medium",
    });
  }

  function startEditingTask(task: TaskDto) {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      planId: task.planId ?? null,
      assignedAgentProfileId: task.assignedAgentProfileId ?? null,
      contextPackId: task.contextPackId ?? null,
      priority: task.priority,
    });
    props.onSelectTask(task.id);
  }

  function submitTaskForm() {
    const payload = {
      projectId: projectId!,
      title: form.title,
      description: form.description,
      priority: form.priority,
      planId: form.planId,
      parentTaskId: null,
      assignedAgentProfileId: form.assignedAgentProfileId,
      contextPackId: form.contextPackId,
    };

    if (editingTaskId) {
      const existingTask = tasks.find((task) => task.id === editingTaskId);
      updateTask.mutate({
        id: editingTaskId,
        data: {
          ...payload,
          status: existingTask?.status ?? "Backlog",
        },
      });
    } else {
      createTask.mutate({
        ...payload,
        status: "Backlog",
      });
    }

    resetTaskForm();
  }

  function moveTaskToStatus(taskId: string, status: TaskStatus) {
    updateTask.mutate({ id: taskId, data: { status } });
    setLiftedTaskId((current) => (current === taskId ? null : current));
  }

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Tasks" />
      <SurfaceCard title={editingTaskId ? "Edit Task" : "Create Task"}>
        <Form>
          <TextField name="task-title" label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <TextArea name="task-description" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
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
        <Flex gap="size-100" wrap marginTop="size-150">
          <Button variant="accent" onPress={submitTaskForm}>
            {editingTaskId ? "Save Task" : "Create Task"}
          </Button>
          {editingTaskId ? (
            <Button variant="secondary" onPress={resetTaskForm}>
              Cancel Edit
            </Button>
          ) : null}
        </Flex>
        <Content marginTop="size-100">Plans: {(plansQuery.data ?? []).map((item) => item.title).join(", ")}</Content>
        <Content>Profiles: {(profilesQuery.data ?? []).map((item) => item.name).join(", ")}</Content>
        <Content>Packs: {(packsQuery.data ?? []).map((item) => item.name).join(", ")}</Content>
      </SurfaceCard>
      <SurfaceCard title="Board Controls" description="Filter the board and manage task flow faster.">
        <Flex gap="size-150" wrap alignItems="end">
          <SearchField aria-label="Search tasks" value={taskSearch} onChange={setTaskSearch} />
          <Picker
            label="Priority Filter"
            items={[{ id: "All", name: "All priorities" }, ...priorityOptions]}
            selectedKey={boardPriorityFilter}
            onSelectionChange={(key) => setBoardPriorityFilter(String(key))}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Content>Visible tasks: {filteredTasks.length}</Content>
          {liftedTask ? <Content>Move Mode: {liftedTask.title} is ready to move. Use a lane drop button or press M on the active card to cancel.</Content> : null}
          {liftedTask ? <Button variant="secondary" onPress={() => setLiftedTaskId(null)}>Cancel Move Mode</Button> : null}
        </Flex>
      </SurfaceCard>
      <Flex gap="size-200" alignItems="start">
        <View flex overflow="auto">
          <Flex gap="size-200">
            {taskStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredTasks.filter((task) => task.status === status)}
                agentLabels={Object.fromEntries(profiles.map((profile) => [profile.id, profile.name]))}
                packLabels={Object.fromEntries(packs.map((pack) => [pack.id, pack.name]))}
                runSummary={taskRunSummary}
                liftedTaskId={liftedTaskId}
                liftedTaskStatus={liftedTask?.status ?? null}
                onDropTask={(taskId) => updateTask.mutate({ id: taskId, data: { status } })}
                onSelectTask={props.onSelectTask}
                onEditTask={startEditingTask}
                onQuickUpdate={(taskId, data) => updateTask.mutate({ id: taskId, data })}
                onLiftTask={setLiftedTaskId}
                onDropLiftedTask={(taskId) => moveTaskToStatus(taskId, status)}
                onMove={moveTaskToStatus}
                onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
                onRun={(task) => {
                  if (!task.assignedAgentProfileId) return;
                  runAgent.mutate({ projectId, taskId: task.id, agentProfileId: task.assignedAgentProfileId });
                }}
              />
            ))}
          </Flex>
        </View>
        <View width={detailPanelWidthValue} minWidth={detailPanelWidthValue} UNSAFE_className="detail-panel">
          <SurfaceCard title="Task Detail Drawer" description="Selected task, context preview, and execution entry point.">
            {selectedTask ? (
              <Flex direction="column" gap="size-100">
                <Text>{selectedTask.title}</Text>
                <Content>{selectedTask.description}</Content>
                <Content>Status: {selectedTask.status}</Content>
                <Content>Priority: {selectedTask.priority}</Content>
                <Content>Plan: {plans.find((plan) => plan.id === selectedTask.planId)?.title ?? "No plan"}</Content>
                <Content>Context Pack: {selectedPack?.name ?? "None"}</Content>
                <Content>Included Context Items: {selectedPack?.itemIds.length ?? 0}</Content>
                <Content>Total Tokens: {selectedPack?.currentTokens ?? 0}</Content>
                <Content>Budget Remaining: {selectedPack?.remainingTokens ?? 0}</Content>
                <ButtonGroup>
                  <Button
                    variant="secondary"
                    isDisabled={!previousSelectedTaskStatus || previousSelectedTaskStatus === selectedTask.status}
                    onPress={() => updateTask.mutate({ id: selectedTask.id, data: { status: previousSelectedTaskStatus! } })}
                  >
                    Move Left
                  </Button>
                  <Button
                    variant="secondary"
                    isDisabled={!nextSelectedTaskStatus || nextSelectedTaskStatus === selectedTask.status}
                    onPress={() => updateTask.mutate({ id: selectedTask.id, data: { status: nextSelectedTaskStatus! } })}
                  >
                    Move Right
                  </Button>
                </ButtonGroup>
                <Divider size="S" marginY="size-100" />
                <Heading level={5}>Run Summary</Heading>
                <Content>Total Runs: {selectedTaskRunSummary?.runCount ?? 0}</Content>
                <Content>Total Tokens Used: {selectedTaskRunSummary?.totalTokens ?? 0}</Content>
                <Content>Total Estimated Cost: ${selectedTaskRunSummary?.totalCost ?? 0}</Content>
                <Content>Latest Run Status: {selectedTaskRunSummary?.latestRun?.status ?? "No runs yet"}</Content>
                <Divider size="S" marginY="size-100" />
                <Heading level={5}>Context Preview</Heading>
                {selectedContextItems.length ? (
                  <Flex direction="column" gap="size-100">
                    {selectedContextItems.map((item) => (
                      <Well key={item.id}>
                        <Flex direction="column" gap="size-50">
                          <Text>{item.title}</Text>
                          <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                          <Content>{item.summary}</Content>
                        </Flex>
                      </Well>
                    ))}
                  </Flex>
                ) : (
                  <Content>No context items are attached to this task yet.</Content>
                )}
                {quickEdit ? (
                  <Form>
                    <Picker label="Status" items={statusOptions} selectedKey={quickEdit.status} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, status: String(key) as TaskStatus })}>
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                    <Picker label="Priority" items={priorityOptions} selectedKey={quickEdit.priority} onSelectionChange={(key) => setQuickEdit({ ...quickEdit, priority: String(key) as TaskPriority })}>
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                    <Picker
                      label="Assigned Agent"
                      items={profileOptions}
                      selectedKey={quickEdit.assignedAgentProfileId ?? "none"}
                      onSelectionChange={(key) => setQuickEdit({ ...quickEdit, assignedAgentProfileId: key === "none" ? null : String(key) })}
                    >
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                    <Picker
                      label="Context Pack"
                      items={packOptions}
                      selectedKey={quickEdit.contextPackId ?? "none"}
                      onSelectionChange={(key) => setQuickEdit({ ...quickEdit, contextPackId: key === "none" ? null : String(key) })}
                    >
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                  </Form>
                ) : null}
                <Divider size="S" marginY="size-100" />
                <Heading level={5}>Recent Agent Runs</Heading>
                {selectedTaskRuns.length ? (
                  <Flex direction="column" gap="size-100">
                    {selectedTaskRuns.map((run) => (
                      <Well key={run.id}>
                        <Flex direction="column" gap="size-50">
                          <Text>{run.status}</Text>
                          <Content>{new Date(run.startedAt).toLocaleString()}</Content>
                          <Content>
                            Tokens: {run.tokenUsage?.totalTokens ?? 0} • Cost: ${run.tokenUsage?.estimatedCost ?? 0}
                          </Content>
                          <Content>{run.output}</Content>
                        </Flex>
                      </Well>
                    ))}
                  </Flex>
                ) : (
                  <Content>No agent runs recorded for this task yet.</Content>
                )}
                <ButtonGroup>
                  <Button variant="secondary" onPress={() => startEditingTask(selectedTask)}>Edit Task</Button>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      if (!quickEdit) return;
                      updateTask.mutate({
                        id: selectedTask.id,
                        data: {
                          status: quickEdit.status,
                          priority: quickEdit.priority,
                          assignedAgentProfileId: quickEdit.assignedAgentProfileId,
                          contextPackId: quickEdit.contextPackId,
                        },
                      });
                    }}
                  >
                    Save Quick Edit
                  </Button>
                  <Button
                    variant="accent"
                    onPress={() => {
                      if (!selectedTask.assignedAgentProfileId) return;
                      runAgent.mutate({ projectId, taskId: selectedTask.id, agentProfileId: selectedTask.assignedAgentProfileId });
                    }}
                  >
                    Run Agent
                  </Button>
                  <Button variant="secondary" onPress={() => deleteTask.mutate(selectedTask.id)}>Delete Task</Button>
                  <Button variant="secondary" onPress={() => props.onSelectTask(null)}>Close</Button>
                </ButtonGroup>
              </Flex>
            ) : (
              <Content>Select a task card to inspect its context and execution state.</Content>
            )}
          </SurfaceCard>
        </View>
      </Flex>
    </Flex>
  );
}

export function KanbanColumn(props: {
  status: TaskStatus;
  tasks: TaskDto[];
  agentLabels: Record<string, string>;
  packLabels: Record<string, string>;
  runSummary: Record<string, TaskRunSummary>;
  liftedTaskId: string | null;
  liftedTaskStatus: TaskStatus | null;
  onDropTask: (taskId: string) => void;
  onSelectTask: (taskId: string | null) => void;
  onEditTask: (task: TaskDto) => void;
  onQuickUpdate: (taskId: string, data: Partial<TaskDto>) => void;
  onLiftTask: (taskId: string | null) => void;
  onDropLiftedTask: (taskId: string) => void;
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onRun: (task: TaskDto) => void;
}) {
  const showDropTarget = canDropLiftedTask(props.liftedTaskId, props.liftedTaskStatus, props.status);

  return (
    <div
      className="glass-panel kanban-column"
      style={{ width: "280px", padding: "16px", borderRadius: "12px", border: "1px solid rgba(167, 187, 226, 0.18)" }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        const taskId = event.dataTransfer.getData("text/task-id");
        if (taskId) props.onDropTask(taskId);
      }}
    >
      <Heading level={4}>{props.status}</Heading>
      <Content marginBottom="size-100">{props.tasks.length} task{props.tasks.length === 1 ? "" : "s"}</Content>
      {showDropTarget ? (
        <Button variant="secondary" marginBottom="size-100" onPress={() => props.onDropLiftedTask(props.liftedTaskId!)}>
          Drop Here
        </Button>
      ) : null}
      <Flex direction="column" gap="size-150">
        {props.tasks.map((task) => {
          const runSummary = props.runSummary[task.id];
          const isLifted = props.liftedTaskId === task.id;
          return (
            <div
              key={task.id}
              className={`task-card${isLifted ? " task-card-lifted" : ""}`}
              draggable
              onDragStart={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData("text/task-id", task.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  props.onMove(task.id, previousStatus(task.status));
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  props.onMove(task.id, nextStatus(task.status));
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onSelectTask(task.id);
                }
                if (event.key.toLowerCase() === "r") {
                  event.preventDefault();
                  props.onRun(task);
                }
                if (event.key.toLowerCase() === "m") {
                  event.preventDefault();
                  props.onLiftTask(toggleLiftedTask(props.liftedTaskId, task.id));
                }
              }}
              role="group"
              tabIndex={0}
              aria-label={`${task.title} task card`}
            >
              <Well>
                <Flex direction="column" gap="size-100">
                  <Flex justifyContent="space-between" alignItems="start" gap="size-100">
                    <View>
                      <Text>{task.title}</Text>
                      <Content>{task.priority} priority</Content>
                    </View>
                    <ActionMenu
                      aria-label={`Actions for ${task.title}`}
                      onAction={(key) => {
                        if (key === "detail") props.onSelectTask(task.id);
                        if (key === "run") props.onRun(task);
                        if (key === "edit") props.onEditTask(task);
                        if (key === "lift") props.onLiftTask(toggleLiftedTask(props.liftedTaskId, task.id));
                        if (key === "left") props.onMove(task.id, previousStatus(task.status));
                        if (key === "right") props.onMove(task.id, nextStatus(task.status));
                        if (key === "delete") props.onDeleteTask(task.id);
                      }}
                    >
                      <Item key="detail">Open Details</Item>
                      <Item key="run">Run Agent</Item>
                      <Item key="edit">Edit Task</Item>
                      <Item key="lift">{isLifted ? "Cancel Move Mode" : "Pick Up Task"}</Item>
                      <Item key="left">Move Left</Item>
                      <Item key="right">Move Right</Item>
                      <Item key="delete">Delete Task</Item>
                    </ActionMenu>
                  </Flex>
                  <Content>{task.description}</Content>
                  <Content>
                    Agent: {task.assignedAgentProfileId ? props.agentLabels[task.assignedAgentProfileId] ?? "Assigned" : "Unassigned"}
                  </Content>
                  <Content>
                    Pack: {task.contextPackId ? props.packLabels[task.contextPackId] ?? "Attached" : "No pack"}
                  </Content>
                  <Content>
                    Runs: {runSummary?.runCount ?? 0} • Tokens: {runSummary?.totalTokens ?? 0}
                  </Content>
                  <Content>
                    Latest Run: {runSummary?.latestRun?.status ?? "No runs"} • Cost: ${runSummary?.totalCost ?? 0}
                  </Content>
                  {isLifted ? <Content>This task is in move mode. Choose a different lane drop button or press M again to cancel.</Content> : null}
                  <Flex gap="size-100" wrap alignItems="end">
                    <Picker
                      aria-label={`Status for ${task.title}`}
                      items={taskStatuses.map((status) => ({ id: status, name: status }))}
                      selectedKey={task.status}
                      onSelectionChange={(key) => props.onQuickUpdate(task.id, { status: String(key) as TaskStatus })}
                    >
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                    <Picker
                      aria-label={`Priority for ${task.title}`}
                      items={taskPriorities.map((priority) => ({ id: priority, name: priority }))}
                      selectedKey={task.priority}
                      onSelectionChange={(key) => props.onQuickUpdate(task.id, { priority: String(key) as TaskPriority })}
                    >
                      {(item) => <Item key={item.id}>{item.name}</Item>}
                    </Picker>
                  </Flex>
                  <ButtonGroup>
                    <ActionButton onPress={() => props.onSelectTask(task.id)}>Detail</ActionButton>
                    <ActionButton onPress={() => props.onEditTask(task)}>Edit</ActionButton>
                    <ActionButton onPress={() => props.onRun(task)}>Run Agent</ActionButton>
                    <ActionButton onPress={() => props.onLiftTask(toggleLiftedTask(props.liftedTaskId, task.id))}>{isLifted ? "Cancel Move" : "Pick Up"}</ActionButton>
                    <ActionButton onPress={() => props.onMove(task.id, previousStatus(task.status))}>Left</ActionButton>
                    <ActionButton onPress={() => props.onMove(task.id, nextStatus(task.status))}>Right</ActionButton>
                  </ButtonGroup>
                </Flex>
              </Well>
            </div>
          );
        })}
        {!props.tasks.length ? <Content>No tasks in this lane right now.</Content> : null}
      </Flex>
    </div>
  );
}
