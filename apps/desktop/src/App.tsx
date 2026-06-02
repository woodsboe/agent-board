import { useEffect, useState, type DragEvent } from "react";
import {
  ActionMenu,
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
import { buildTaskRunSummary, type TaskRunSummary } from "./task-run-summary";

function Shell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    activeProjectId,
    setActiveProjectId,
    commandPaletteOpen,
    setCommandPaletteOpen,
    selectedTaskId,
    setSelectedTaskId,
    themeMode,
    boardDensity,
    sidebarWidth,
  } = useAppStore();
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

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.boardDensity = boardDensity;
  }, [boardDensity, themeMode]);

  const sidebarWidthValue = sidebarWidth === "narrow" ? 240 : sidebarWidth === "wide" ? 360 : 300;

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
        <View
          width={sidebarWidthValue}
          minWidth={sidebarWidthValue}
          padding="size-250"
          borderEndWidth="thin"
          borderColor="dark"
          UNSAFE_className="glass-panel sidebar-panel"
        >
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

  const activeProjectId = projectId;
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
  const selectedPack = packs.find((pack) => pack.id === selectedTask?.contextPackId) ?? null;
  const selectedContextItems = selectedPack ? contextItems.filter((item) => selectedPack.itemIds.includes(item.id)) : [];
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
              onDropTask={(taskId) => updateTask.mutate({ id: taskId, data: { status } })}
              onSelectTask={props.onSelectTask}
              onEditTask={startEditingTask}
              onMove={(taskId, nextStatus) => updateTask.mutate({ id: taskId, data: { status: nextStatus } })}
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

function KanbanColumn(props: {
  status: TaskStatus;
  tasks: TaskDto[];
  agentLabels: Record<string, string>;
  packLabels: Record<string, string>;
  runSummary: Record<string, TaskRunSummary>;
  onDropTask: (taskId: string) => void;
  onSelectTask: (taskId: string | null) => void;
  onEditTask: (task: TaskDto) => void;
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
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
      <Content marginBottom="size-100">{props.tasks.length} task{props.tasks.length === 1 ? "" : "s"}</Content>
      <Flex direction="column" gap="size-150">
        {props.tasks.map((task) => {
          const runSummary = props.runSummary[task.id];
          return (
          <div
            key={task.id}
            className="task-card"
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
            }}
            role="button"
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
                      if (key === "left") props.onMove(task.id, previousStatus(task.status));
                      if (key === "right") props.onMove(task.id, nextStatus(task.status));
                      if (key === "delete") props.onDeleteTask(task.id);
                    }}
                  >
                    <Item key="detail">Open Details</Item>
                    <Item key="run">Run Agent</Item>
                    <Item key="edit">Edit Task</Item>
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
                <ButtonGroup>
                  <ActionButton onPress={() => props.onSelectTask(task.id)}>Detail</ActionButton>
                  <ActionButton onPress={() => props.onEditTask(task)}>Edit</ActionButton>
                  <ActionButton onPress={() => props.onRun(task)}>Run Agent</ActionButton>
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

function ContextPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ["context-items", projectId], queryFn: () => api.getContextItems(projectId!), enabled: Boolean(projectId) });
  const packsQuery = useQuery({ queryKey: ["context-packs", projectId], queryFn: () => api.getContextPacks(projectId!), enabled: Boolean(projectId) });
  const createItem = useMutation({
    mutationFn: api.createContextItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateContextItem>[1] }) => api.updateContextItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const deleteItem = useMutation({
    mutationFn: api.deleteContextItem,
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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
  const selectedItems = filteredItems.filter((item) => selectedItemIds.includes(item.id));
  const availableItems = filteredItems.filter((item) => !selectedItemIds.includes(item.id));

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Context" />
      <Flex gap="size-200" wrap>
        <SurfaceCard title={editingItemId ? "Edit Context Item" : "Create Context Item"}>
          <Form>
            <TextField name="context-title" label="Title" value={itemForm.title} onChange={(value) => setItemForm({ ...itemForm, title: value })} />
            <TextField name="context-summary" label="Summary" value={itemForm.summary} onChange={(value) => setItemForm({ ...itemForm, summary: value })} />
            <TextArea name="context-content" label="Content" value={itemForm.content} onChange={(value) => setItemForm({ ...itemForm, content: value })} />
            <TextField name="context-type" label="Type" value={itemForm.type} onChange={(value) => setItemForm({ ...itemForm, type: value })} />
            <TextField
              name="context-token-estimate"
              label="Token Estimate"
              type="number"
              value={String(itemForm.tokenEstimate)}
              onChange={(value) => setItemForm({ ...itemForm, tokenEstimate: Number(value) || 0 })}
            />
            <TextField name="context-tags" label="Tags" value={itemForm.tags} onChange={(value) => setItemForm({ ...itemForm, tags: value })} />
            <TextField name="context-source-type" label="Source Type" value={itemForm.sourceType} onChange={(value) => setItemForm({ ...itemForm, sourceType: value })} />
            <TextField
              name="context-source-reference"
              label="Source Reference"
              value={itemForm.sourceReference}
              onChange={(value) => setItemForm({ ...itemForm, sourceReference: value })}
            />
            <Button
              variant="accent"
              onPress={() => {
                const payload = {
                  projectId,
                  title: itemForm.title,
                  summary: itemForm.summary,
                  content: itemForm.content,
                  type: itemForm.type as ContextItemDto["type"],
                  tokenEstimate: itemForm.tokenEstimate,
                  tags: itemForm.tags.split(",").map((entry) => entry.trim()).filter(Boolean),
                  sourceType: itemForm.sourceType as ContextItemDto["sourceType"],
                  sourceReference: itemForm.sourceReference,
                };
                if (editingItemId) {
                  updateItem.mutate({ id: editingItemId, data: payload });
                } else {
                  createItem.mutate(payload);
                }
                setEditingItemId(null);
                setItemForm({
                  title: "",
                  summary: "",
                  content: "",
                  type: "Architecture",
                  tokenEstimate: 120,
                  tags: "architecture",
                  sourceType: "Manual",
                  sourceReference: "manual",
                });
              }}
            >
              {editingItemId ? "Save Context Item" : "Create Context Item"}
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
      <SurfaceCard title="Context Pack Builder" description="Add and remove context items in the current draft before saving the pack.">
        <Flex gap="size-150" wrap marginBottom="size-200">
          <Button variant="secondary" onPress={() => setSelectedItemIds(filteredItems.map((item) => item.id))}>Add All Filtered</Button>
          <Button variant="secondary" onPress={() => setSelectedItemIds([])}>Clear Draft</Button>
          <Content>{selectedItemIds.length} items currently selected for this pack draft</Content>
        </Flex>
        <Flex gap="size-250" wrap>
          <View flex>
            <Heading level={4}>Available Context Items</Heading>
            {availableItems.length ? availableItems.map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                    <Content>{item.tags.join(", ")}</Content>
                  </View>
                  <Button variant="secondary" onPress={() => setSelectedItemIds([...selectedItemIds, item.id])}>Add</Button>
                </Flex>
              </Well>
            )) : <Content>No more items match the current filters.</Content>}
          </View>
          <View flex>
            <Heading level={4}>Selected For Current Pack</Heading>
            {selectedItems.length ? selectedItems.map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                    <Content>{item.tags.join(", ")}</Content>
                  </View>
                  <Button variant="secondary" onPress={() => setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id))}>Remove</Button>
                </Flex>
              </Well>
            )) : <Content>No context items selected yet.</Content>}
          </View>
        </Flex>
      </SurfaceCard>
      <SurfaceCard title="Context Packs" description="Saved packs and maintenance actions.">
        <Flex gap="size-250" wrap>
          <View flex>
            <Heading level={4}>Available Context Items</Heading>
            {(itemsQuery.data ?? []).map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.summary}</Content>
                    <Content>{item.sourceType} • {item.sourceReference}</Content>
                    <Content>{item.tokenEstimate} tokens</Content>
                  </View>
                  <ButtonGroup>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setEditingItemId(item.id);
                        setItemForm({
                          title: item.title,
                          summary: item.summary,
                          content: item.content,
                          type: item.type,
                          tokenEstimate: item.tokenEstimate,
                          tags: item.tags.join(", "),
                          sourceType: item.sourceType,
                          sourceReference: item.sourceReference,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="secondary" onPress={() => deleteItem.mutate(item.id)}>Delete</Button>
                  </ButtonGroup>
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
  const {
    themeMode,
    setThemeMode,
    boardDensity,
    setBoardDensity,
    sidebarWidth,
    setSidebarWidth,
    detailPanelWidth,
    setDetailPanelWidth,
  } = useAppStore();

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Settings" />
      <SurfaceCard title="Environment">
        <Content>Local-first mode only. No authentication or SaaS sync configured in V1.</Content>
      </SurfaceCard>
      <SurfaceCard title="Workspace Preferences" description="Persisted locally for this machine and browser profile.">
        <Form>
          <Picker label="Theme" items={[{ id: "dark", name: "Dark" }, { id: "light", name: "Light" }]} selectedKey={themeMode} onSelectionChange={(key) => setThemeMode(String(key) as "dark" | "light")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Board Density"
            items={[{ id: "comfortable", name: "Comfortable" }, { id: "compact", name: "Compact" }]}
            selectedKey={boardDensity}
            onSelectionChange={(key) => setBoardDensity(String(key) as "comfortable" | "compact")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Sidebar Width"
            items={[{ id: "narrow", name: "Narrow" }, { id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]}
            selectedKey={sidebarWidth}
            onSelectionChange={(key) => setSidebarWidth(String(key) as "narrow" | "standard" | "wide")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Task Detail Width"
            items={[{ id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]}
            selectedKey={detailPanelWidth}
            onSelectionChange={(key) => setDetailPanelWidth(String(key) as "standard" | "wide")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
        </Form>
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
