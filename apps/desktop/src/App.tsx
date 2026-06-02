import { lazy, Suspense, useEffect } from "react";
import {
  Button,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Heading,
  Item,
  ListBox,
  ProgressCircle,
  View,
} from "@adobe/react-spectrum";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDto } from "@agentboard/shared";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAppStore } from "./store";

const DashboardPage = lazy(async () => {
  const module = await import("./pages/dashboard-page");
  return { default: module.DashboardPage };
});
const ProjectsPage = lazy(async () => {
  const module = await import("./pages/projects-page");
  return { default: module.ProjectsPage };
});
const PlansPage = lazy(async () => {
  const module = await import("./pages/plans-page");
  return { default: module.PlansPage };
});
const TasksPage = lazy(async () => {
  const module = await import("./pages/tasks-page");
  return { default: module.TasksPage };
});
const ContextPage = lazy(async () => {
  const module = await import("./pages/context-page");
  return { default: module.ContextPage };
});
const AgentRunsPage = lazy(async () => {
  const module = await import("./pages/agent-runs-page");
  return { default: module.AgentRunsPage };
});
const GitPage = lazy(async () => {
  const module = await import("./pages/git-page");
  return { default: module.GitPage };
});
const SettingsPage = lazy(async () => {
  const module = await import("./pages/settings-page");
  return { default: module.SettingsPage };
});

function RouteLoader() {
  return (
    <Flex alignItems="center" justifyContent="center" minHeight="320px">
      <ProgressCircle aria-label="Loading page" isIndeterminate />
    </Flex>
  );
}

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
          <Suspense fallback={<RouteLoader />}>
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
          </Suspense>
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

export function App() {
  return <Shell />;
}

export { KanbanColumn } from "./pages/tasks-page";
