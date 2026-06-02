import { useEffect, useState, type DragEvent } from "react";
import {
  ActionButton,
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
  ListBox,
  SearchField,
  Text,
  TextArea,
  TextField,
  View,
  Well,
  IllustratedMessage,
  ProgressCircle,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Meter,
  Picker,
  ProgressBar,
} from "@adobe/react-spectrum";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contextTypes, taskPriorities, taskStatuses, type TaskPriority, type TaskStatus } from "@agentboard/domain";
import type { AgentRunWithDiffDto, ContextItemDto, ContextPackDto, PlanDto, ProjectDto, TaskDto } from "@agentboard/shared";
import { SurfaceCard, SectionHeader } from "@agentboard/ui";
import { api } from "./api";
import { useAppStore } from "./store";
import { nextStatus, previousStatus } from "./task-status";

function Shell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeProjectId, setActiveProjectId, commandPaletteOpen, setCommandPaletteOpen, selectedTaskId, setSelectedTaskId } = useAppStore();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });

  useEffect(() => {
    if (!activeProjectId && projectsQuery.data?.[0]) {
      setActiveProjectId(projectsQuery.data[0].id);
    }
  }, [activeProjectId, projectsQuery.data, setActiveProjectId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  const commands = [
    { id: "create-task", label: "Create Task", run: () => navigate("/tasks") },
    { id: "create-plan", label: "Create Plan", run: () => navigate("/plans") },
    { id: "create-context-item", label: "Create Context Item", run: () => navigate("/context") },
    { id: "create-context-pack", label: "Create Context Pack", run: () => navigate("/context") },
    {
      id: "run-agent",
      label: "Run Agent",
      run: async () => {
        if (!activeProjectId || !selectedTaskId) return;
        const task = queryClient.getQueryData<TaskDto[]>(["tasks", activeProjectId])?.find((entry) => entry.id === selectedTaskId);
        const profileId = task?.assignedAgentProfileId;
        if (!profileId) return;
        await api.runAgent({ projectId: activeProjectId, taskId: selectedTaskId, agentProfileId: profileId });
        queryClient.invalidateQueries({ queryKey: ["agent-runs", activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", activeProjectId] });
      },
    },
    { id: "search-context", label: "Search Context", run: () => navigate("/context") },
    { id: "open-project", label: "Open Project", run: () => navigate("/projects") },
  ];

  if (projectsQuery.isLoading) {
    return (
      <Flex alignItems="center" justifyContent="center" height="100%">
        <ProgressCircle aria-label="Loading projects" isIndeterminate />
      </Flex>
    );
  }

  return (
    <Flex direction="column" height="100%" UNSAFE_className="app-shell">
      <Flex gap="size-200" height="100%">
        <View width="size-3000" padding="size-250" borderEndWidth="thin" borderColor="dark" UNSAFE_className="glass-panel">
          <Heading level={2}>AgentBoard</Heading>
          <Content marginBottom="size-250">Local-first operating system for agentic software projects.</Content>
          <Flex direction="column" gap="size-100" marginTop="size-150">
            {(projectsQuery.data ?? []).map((project) => (
              <Button
                key={project.id}
                variant={activeProjectId === project.id ? "accent" : "secondary"}
                onPress={() => setActiveProjectId(project.id)}
              >
                {project.name}
              </Button>
            ))}
          </Flex>
          <Divider size="S" marginY="size-250" />
          <Flex direction="column" gap="size-100">
            {["dashboard", "projects", "plans", "tasks", "context", "agent-runs", "git", "settings"].map((path) => (
              <NavLink key={path} to={`/${path}`} style={{ color: "inherit", textDecoration: "none" }}>
                {path.replace("-", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
              </NavLink>
            ))}
          </Flex>
        </View>
        <View flex minWidth={0} padding="size-250" overflow="auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/tasks" element={<TasksPage onSelectTask={setSelectedTaskId} />} />
            <Route path="/context" element={<ContextPage />} />
            <Route path="/agent-runs" element={<AgentRunsPage />} />
            <Route path="/git" element={<GitPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </View>
      </Flex>
      <DialogContainer onDismiss={() => setCommandPaletteOpen(false)}>
        {commandPaletteOpen ? (
          <Dialog>
            <Heading>Command Palette</Heading>
            <Content>
              <ListBox
                aria-label="Command palette"
                items={commands}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0];
                  const command = commands.find((entry) => entry.id === key);
                  setCommandPaletteOpen(false);
                  command?.run();
                }}
              >
                {(command) => <Item key={command.id}>{command.label}</Item>}
              </ListBox>
            </Content>
          </Dialog>
        ) : null}
      </DialogContainer>
    </Flex>
  );
}

function DashboardPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => api.getDashboard(projectId!),
    enabled: Boolean(projectId),
  });

  if (!projectId) return <EmptyState label="No project selected" />;
  if (dashboardQuery.isLoading) return <ProgressCircle aria-label="Loading dashboard" isIndeterminate />;
  const data = dashboardQuery.data!;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Dashboard" />
      <Flex gap="size-200" wrap>
        <SurfaceCard title="Open Tasks">
          <Heading level={1}>{data.openTasks}</Heading>
        </SurfaceCard>
        <SurfaceCard title="Running Tasks">
          <Heading level={1}>{data.runningTasks}</Heading>
        </SurfaceCard>
        <SurfaceCard title="Completed Tasks">
          <Heading level={1}>{data.completedTasks}</Heading>
        </SurfaceCard>
        <SurfaceCard title="Plans">
          <Content>Active: {data.activePlans}</Content>
          <Content>Approved: {data.approvedPlans}</Content>
        </SurfaceCard>
      </Flex>
      <Flex gap="size-200" wrap>
        <SurfaceCard title="Project Token Usage" description={`${data.tokenUsageByProject} total tokens`}>
          <Meter label="Token Load" value={Math.min(data.tokenUsageByProject, 5000)} minValue={0} maxValue={5000} />
        </SurfaceCard>
        <SurfaceCard title="Recent Runs">
          {data.recentRuns.map((run) => (
            <Well key={run.id} marginBottom="size-100">
              <Text>{run.output.split("\n")[0]}</Text>
            </Well>
          ))}
        </SurfaceCard>
        <SurfaceCard title="Usage By Agent">
          {data.tokenUsageByAgent.map((agent) => (
            <View key={agent.agentName} marginBottom="size-150">
              <Text>{agent.agentName}</Text>
              <ProgressBar value={Math.min(agent.totalTokens, 1500)} label={`${agent.totalTokens} tokens`} />
            </View>
          ))}
        </SurfaceCard>
      </Flex>
    </Flex>
  );
}

function ProjectsPage() {
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateProject>[1] }) => api.updateProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const [form, setForm] = useState({
    name: "New Project",
    description: "Local-first software project.",
    gitRepositoryPath: ".",
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingProjectId) return;
    const project = projectsQuery.data?.find((entry) => entry.id === editingProjectId);
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        gitRepositoryPath: project.gitRepositoryPath,
      });
    }
  }, [editingProjectId, projectsQuery.data]);

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Projects" />
      <SurfaceCard title={editingProjectId ? "Edit Project" : "Create Project"}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <TextField name="project-name" label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <TextArea name="project-description" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <TextField name="project-git-path" label="Git Repository Path" value={form.gitRepositoryPath} onChange={(value) => setForm({ ...form, gitRepositoryPath: value })} />
          <Button
            variant="accent"
            onPress={() => {
              if (editingProjectId) {
                updateProject.mutate({ id: editingProjectId, data: form });
              } else {
                createProject.mutate(form);
              }
              setEditingProjectId(null);
              setForm({ name: "New Project", description: "Local-first software project.", gitRepositoryPath: "." });
            }}
          >
            {editingProjectId ? "Save Project" : "Create Project"}
          </Button>
        </Form>
      </SurfaceCard>
      <SurfaceCard title="Project List">
        {(projectsQuery.data ?? []).map((project) => (
          <Well key={project.id} marginBottom="size-150">
            <Flex justifyContent="space-between" alignItems="center">
              <View>
                <Text>{project.name}</Text>
                <Content>{project.description}</Content>
                <Content>Repository: {project.gitRepositoryPath}</Content>
              </View>
              <ButtonGroup>
                <Button variant={activeProjectId === project.id ? "accent" : "secondary"} onPress={() => setActiveProjectId(project.id)}>
                  {activeProjectId === project.id ? "Selected" : "Open"}
                </Button>
                <Button variant="secondary" onPress={() => setEditingProjectId(project.id)}>Edit</Button>
              </ButtonGroup>
            </Flex>
          </Well>
        ))}
      </SurfaceCard>
    </Flex>
  );
}

function PlansPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const plansQuery = useQuery({ queryKey: ["plans", projectId], queryFn: () => api.getPlans(projectId!), enabled: Boolean(projectId) });
  const createPlan = useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const updatePlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updatePlan>[1] }) => api.updatePlan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const approvePlan = useMutation({
    mutationFn: api.approvePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const archivePlan = useMutation({
    mutationFn: api.archivePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const [form, setForm] = useState({ title: "", description: "" });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Plans" />
      <SurfaceCard title={editingPlanId ? "Edit Plan" : "Create Plan"}>
        <Form>
          <TextField name="plan-title" label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <TextArea name="plan-description" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <Button
            variant="accent"
            onPress={() => {
              if (editingPlanId) {
                updatePlan.mutate({ id: editingPlanId, data: { title: form.title, description: form.description } });
              } else {
                createPlan.mutate({ projectId, title: form.title, description: form.description, status: "Draft" });
              }
              setEditingPlanId(null);
              setForm({ title: "", description: "" });
            }}
          >
            {editingPlanId ? "Save Plan" : "Create Plan"}
          </Button>
        </Form>
      </SurfaceCard>
      <SurfaceCard title="Plan List">
        {(plansQuery.data ?? []).map((plan) => (
          <Well key={plan.id} marginBottom="size-150">
            <Flex justifyContent="space-between" alignItems="center">
              <View>
                <Text>{plan.title}</Text>
                <Content>{plan.description}</Content>
                <Content>Status: {plan.status}</Content>
              </View>
              <ButtonGroup>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setEditingPlanId(plan.id);
                    setForm({ title: plan.title, description: plan.description });
                  }}
                >
                  Edit
                </Button>
                <Button variant="secondary" onPress={() => approvePlan.mutate(plan.id)}>Approve</Button>
                <Button variant="secondary" onPress={() => archivePlan.mutate(plan.id)}>Archive</Button>
              </ButtonGroup>
            </Flex>
          </Well>
        ))}
      </SurfaceCard>
    </Flex>
  );
}

function TasksPage(props: { onSelectTask: (id: string | null) => void }) {
  const projectId = useAppStore((state) => state.activeProjectId);
  const selectedTaskId = useAppStore((state) => state.selectedTaskId);
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({ queryKey: ["tasks", projectId], queryFn: () => api.getTasks(projectId!), enabled: Boolean(projectId) });
  const plansQuery = useQuery({ queryKey: ["plans", projectId], queryFn: () => api.getPlans(projectId!), enabled: Boolean(projectId) });
  const profilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const packsQuery = useQuery({ queryKey: ["context-packs", projectId], queryFn: () => api.getContextPacks(projectId!), enabled: Boolean(projectId) });
  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });
  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskDto> }) => api.updateTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
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
  const [quickEdit, setQuickEdit] = useState<{
    status: TaskStatus;
    priority: TaskPriority;
    assignedAgentProfileId: string | null;
    contextPackId: string | null;
  } | null>(null);

  const tasks = tasksQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const packs = packsQuery.data ?? [];
  const planOptions = [{ id: "none", name: "No plan" }, ...plans.map((plan) => ({ id: plan.id, name: plan.title }))];
  const profileOptions = [{ id: "none", name: "Unassigned" }, ...profiles.map((profile) => ({ id: profile.id, name: profile.name }))];
  const packOptions = [{ id: "none", name: "No pack" }, ...packs.map((pack) => ({ id: pack.id, name: pack.name }))];
  const statusOptions = taskStatuses.map((status) => ({ id: status, name: status }));
  const priorityOptions = taskPriorities.map((priority) => ({ id: priority, name: priority }));
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedPack = packs.find((pack) => pack.id === selectedTask?.contextPackId) ?? null;

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

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Tasks" />
      <SurfaceCard title="Create Task">
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
          <Button
            variant="accent"
            onPress={() =>
              createTask.mutate({
                projectId,
                title: form.title,
                description: form.description,
                status: "Backlog",
                priority: form.priority,
                planId: form.planId,
                parentTaskId: null,
                assignedAgentProfileId: form.assignedAgentProfileId,
                contextPackId: form.contextPackId,
              })
            }
          >
            Create Task
          </Button>
        </Form>
        <Content marginTop="size-100">Plans: {(plansQuery.data ?? []).map((item) => item.title).join(", ")}</Content>
        <Content>Profiles: {(profilesQuery.data ?? []).map((item) => item.name).join(", ")}</Content>
        <Content>Packs: {(packsQuery.data ?? []).map((item) => item.name).join(", ")}</Content>
      </SurfaceCard>
      <Flex gap="size-200" alignItems="start">
        <View flex overflow="auto">
        <Flex gap="size-200">
          {taskStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter((task) => task.status === status)}
              onDropTask={(taskId) => updateTask.mutate({ id: taskId, data: { status } })}
              onSelectTask={props.onSelectTask}
              onMove={(taskId, nextStatus) => updateTask.mutate({ id: taskId, data: { status: nextStatus } })}
              onRun={(task) => {
                if (!task.assignedAgentProfileId) return;
                runAgent.mutate({ projectId, taskId: task.id, agentProfileId: task.assignedAgentProfileId });
              }}
            />
          ))}
        </Flex>
        </View>
        <View width="size-3400" minWidth="size-3400">
          <SurfaceCard title="Task Detail Drawer" description="Selected task, context preview, and execution entry point.">
            {selectedTask ? (
              <Flex direction="column" gap="size-100">
                <Text>{selectedTask.title}</Text>
                <Content>{selectedTask.description}</Content>
                <Content>Status: {selectedTask.status}</Content>
                <Content>Priority: {selectedTask.priority}</Content>
                <Content>Context Pack: {selectedPack?.name ?? "None"}</Content>
                <Content>Included Context Items: {selectedPack?.itemIds.length ?? 0}</Content>
                <Content>Total Tokens: {selectedPack?.currentTokens ?? 0}</Content>
                <Content>Budget Remaining: {selectedPack?.remainingTokens ?? 0}</Content>
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
                <ButtonGroup>
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

function KanbanColumn(props: {
  status: TaskStatus;
  tasks: TaskDto[];
  onDropTask: (taskId: string) => void;
  onSelectTask: (taskId: string | null) => void;
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onRun: (task: TaskDto) => void;
}) {
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
      <Flex direction="column" gap="size-150">
        {props.tasks.map((task) => (
          <div
            key={task.id}
            className="task-card"
            draggable
            onDragStart={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData("text/task-id", task.id)}
          >
            <Well>
              <Flex direction="column" gap="size-100">
                <Text>{task.title}</Text>
                <Content>{task.description}</Content>
                <ButtonGroup>
                  <ActionButton onPress={() => props.onSelectTask(task.id)}>Detail</ActionButton>
                  <ActionButton onPress={() => props.onRun(task)}>Run Agent</ActionButton>
                  <ActionButton onPress={() => props.onMove(task.id, previousStatus(task.status))}>Left</ActionButton>
                  <ActionButton onPress={() => props.onMove(task.id, nextStatus(task.status))}>Right</ActionButton>
                </ButtonGroup>
              </Flex>
            </Well>
          </div>
        ))}
      </Flex>
    </div>
  );
}

function ContextPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ["context-items", projectId], queryFn: () => api.getContextItems(projectId!), enabled: Boolean(projectId) });
  const packsQuery = useQuery({ queryKey: ["context-packs", projectId], queryFn: () => api.getContextPacks(projectId!), enabled: Boolean(projectId) });
  const createItem = useMutation({
    mutationFn: api.createContextItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const createPack = useMutation({
    mutationFn: api.createContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const updatePack = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateContextPack>[1] }) => api.updateContextPack(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const deletePack = useMutation({
    mutationFn: api.deleteContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const duplicatePack = useMutation({
    mutationFn: api.duplicateContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("updated");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemForm, setItemForm] = useState({
    title: "",
    summary: "",
    content: "",
    type: "Architecture",
    tokenEstimate: 120,
    tags: "architecture",
    sourceType: "Manual",
    sourceReference: "manual",
  });
  const [packForm, setPackForm] = useState({ name: "", description: "", tokenBudget: 800 });
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const typeFilterOptions = [{ id: "All", name: "All types" }, ...contextTypes.map((type) => ({ id: type, name: type }))];
  const sortOptions = [
    { id: "updated", name: "Last updated" },
    { id: "title", name: "Title" },
    { id: "tokens", name: "Token estimate" },
  ];

  if (!projectId) return <EmptyState label="No project selected" />;
  const filteredItems = (itemsQuery.data ?? [])
    .filter((item) =>
      `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((item) => typeFilter === "All" || item.type === typeFilter)
    .sort((left, right) => {
      if (sortBy === "title") return left.title.localeCompare(right.title);
      if (sortBy === "tokens") return right.tokenEstimate - left.tokenEstimate;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Context" />
      <Flex gap="size-200" wrap>
        <SurfaceCard title="Create Context Item">
          <Form>
            <TextField name="context-title" label="Title" value={itemForm.title} onChange={(value) => setItemForm({ ...itemForm, title: value })} />
            <TextField name="context-summary" label="Summary" value={itemForm.summary} onChange={(value) => setItemForm({ ...itemForm, summary: value })} />
            <TextArea name="context-content" label="Content" value={itemForm.content} onChange={(value) => setItemForm({ ...itemForm, content: value })} />
            <TextField name="context-type" label="Type" value={itemForm.type} onChange={(value) => setItemForm({ ...itemForm, type: value })} />
            <TextField name="context-tags" label="Tags" value={itemForm.tags} onChange={(value) => setItemForm({ ...itemForm, tags: value })} />
            <Button
              variant="accent"
              onPress={() =>
                createItem.mutate({
                  projectId,
                  title: itemForm.title,
                  summary: itemForm.summary,
                  content: itemForm.content,
                  type: itemForm.type as ContextItemDto["type"],
                  tokenEstimate: itemForm.tokenEstimate,
                  tags: itemForm.tags.split(",").map((entry) => entry.trim()).filter(Boolean),
                  sourceType: itemForm.sourceType as ContextItemDto["sourceType"],
                  sourceReference: itemForm.sourceReference,
                })
              }
            >
              Create Context Item
            </Button>
          </Form>
        </SurfaceCard>
        <SurfaceCard title={editingPackId ? "Edit Context Pack" : "Build Context Pack"}>
          <Form>
            <TextField name="pack-name" label="Name" value={packForm.name} onChange={(value) => setPackForm({ ...packForm, name: value })} />
            <TextArea name="pack-description" label="Description" value={packForm.description} onChange={(value) => setPackForm({ ...packForm, description: value })} />
            <TextField
              name="pack-token-budget"
              label="Token Budget"
              type="number"
              value={String(packForm.tokenBudget)}
              onChange={(value) => setPackForm({ ...packForm, tokenBudget: Number(value) || 0 })}
            />
            <Button
              variant="accent"
              onPress={() => {
                const payload = {
                  projectId,
                  name: packForm.name,
                  description: packForm.description,
                  tokenBudget: packForm.tokenBudget,
                  itemIds: selectedItemIds,
                };
                if (editingPackId) {
                  updatePack.mutate({ id: editingPackId, data: payload });
                } else {
                  createPack.mutate(payload);
                }
                setEditingPackId(null);
                setPackForm({ name: "", description: "", tokenBudget: 800 });
                setSelectedItemIds([]);
              }}
            >
              {editingPackId ? "Save Pack" : "Create Pack"}
            </Button>
          </Form>
        </SurfaceCard>
      </Flex>
      <SurfaceCard title="Context Library" description="Search, filter, tag, and sort reusable context.">
        <Flex gap="size-150" wrap marginBottom="size-150">
          <SearchField aria-label="Search context" value={search} onChange={setSearch} />
          <Picker label="Type Filter" items={typeFilterOptions} selectedKey={typeFilter} onSelectionChange={(key) => setTypeFilter(String(key))}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker label="Sort By" items={sortOptions} selectedKey={sortBy} onSelectionChange={(key) => setSortBy(String(key))}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
        </Flex>
        <TableView aria-label="Context library" selectionMode="multiple" selectedKeys={selectedItemIds} onSelectionChange={(keys) => setSelectedItemIds(Array.from(keys).map(String))}>
          <TableHeader>
            <Column key="title">Title</Column>
            <Column key="type">Type</Column>
            <Column key="tags">Tags</Column>
            <Column key="tokens">Tokens</Column>
            <Column key="updated">Last Updated</Column>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <Row key={item.id}>
                <Cell>{item.title}</Cell>
                <Cell>{item.type}</Cell>
                <Cell>
                  <Text>{item.tags.join(", ")}</Text>
                </Cell>
                <Cell>{item.tokenEstimate}</Cell>
                <Cell>{new Date(item.updatedAt).toLocaleString()}</Cell>
              </Row>
            ))}
          </TableBody>
        </TableView>
      </SurfaceCard>
      <SurfaceCard title="Context Packs" description="Available items on the left, selected pack state on the right.">
        <Flex gap="size-250" wrap>
          <View flex>
            <Heading level={4}>Available Context Items</Heading>
            {(itemsQuery.data ?? []).map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between">
                  <Text>{item.title}</Text>
                  <Text>{item.tokenEstimate} tokens</Text>
                </Flex>
              </Well>
            ))}
          </View>
          <View flex>
            <Heading level={4}>Selected Context Packs</Heading>
            {(packsQuery.data ?? []).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onDuplicate={() => duplicatePack.mutate(pack.id)}
                onDelete={() => deletePack.mutate(pack.id)}
                onEdit={() => {
                  setEditingPackId(pack.id);
                  setPackForm({ name: pack.name, description: pack.description, tokenBudget: pack.tokenBudget });
                  setSelectedItemIds(pack.itemIds);
                }}
              />
            ))}
          </View>
        </Flex>
      </SurfaceCard>
    </Flex>
  );
}

function PackCard(props: { pack: ContextPackDto; onDuplicate: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <Well marginBottom="size-150">
      <Flex direction="column" gap="size-100">
        <Text>{props.pack.name}</Text>
        <Content>{props.pack.description}</Content>
        <Content>Token Budget: {props.pack.tokenBudget}</Content>
        <Content>Current Tokens: {props.pack.currentTokens}</Content>
        <Content>Remaining Tokens: {props.pack.remainingTokens}</Content>
        <Content>Items in Pack: {props.pack.itemIds.length}</Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={props.onEdit}>Edit</Button>
          <Button variant="secondary" onPress={props.onDuplicate}>Duplicate</Button>
          <Button variant="secondary" onPress={props.onDelete}>Delete</Button>
        </ButtonGroup>
      </Flex>
    </Well>
  );
}

function AgentRunsPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const runsQuery = useQuery({ queryKey: ["agent-runs", projectId], queryFn: () => api.getAgentRuns(projectId!), enabled: Boolean(projectId) });

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Agent Runs" />
      {(runsQuery.data ?? []).map((run: AgentRunWithDiffDto) => (
        <SurfaceCard key={run.id} title={run.status}>
          <Content>Prompt</Content>
          <Well marginBottom="size-150">{run.prompt}</Well>
          <Content>Output</Content>
          <Well marginBottom="size-150">{run.output}</Well>
          <Content>Usage</Content>
          <Content>
            {run.tokenUsage?.promptTokens} prompt / {run.tokenUsage?.completionTokens} completion / {run.tokenUsage?.totalTokens} total / $
            {run.tokenUsage?.estimatedCost}
          </Content>
          <Content>Timing</Content>
          <Content>
            {new Date(run.startedAt).toLocaleString()} - {run.completedAt ? new Date(run.completedAt).toLocaleString() : "In progress"}
          </Content>
          <Content>Context Items</Content>
          <Content>{run.contextSnapshot.map((item) => item.title).join(", ")}</Content>
          {run.contextDiff ? (
            <>
              <Content marginTop="size-150">Context Diff</Content>
              <Content>Added: {run.contextDiff.added.map((item) => item.title).join(", ") || "None"}</Content>
              <Content>Removed: {run.contextDiff.removed.map((item) => item.title).join(", ") || "None"}</Content>
              <Content>Modified: {run.contextDiff.modified.map((item) => item.title).join(", ") || "None"}</Content>
            </>
          ) : null}
        </SurfaceCard>
      ))}
    </Flex>
  );
}

function GitPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const gitQuery = useQuery({ queryKey: ["git", projectId], queryFn: () => api.getGitDashboard(projectId!), enabled: Boolean(projectId) });

  if (!projectId) return <EmptyState label="No project selected" />;
  if (gitQuery.isLoading) return <ProgressCircle aria-label="Loading git status" isIndeterminate />;
  const data = gitQuery.data!;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Git" />
      <SurfaceCard title="Repository Dashboard">
        <Content>Current Branch: {data.branch}</Content>
        <Content>Latest Commit: {data.latestCommit}</Content>
        <Content>Modified Files: {data.modifiedFiles.join(", ") || "None"}</Content>
        <Content>Untracked Files: {data.untrackedFiles.join(", ") || "None"}</Content>
      </SurfaceCard>
    </Flex>
  );
}

function SettingsPage() {
  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Settings" />
      <SurfaceCard title="Environment">
        <Content>Local-first mode only. No authentication or SaaS sync configured in V1.</Content>
      </SurfaceCard>
    </Flex>
  );
}

function EmptyState(props: { label: string }) {
  return (
    <IllustratedMessage>
      <Heading>{props.label}</Heading>
    </IllustratedMessage>
  );
}

export function App() {
  return <Shell />;
}
