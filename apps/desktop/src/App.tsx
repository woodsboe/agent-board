import { lazy, Suspense, useEffect, useState } from "react";
import {
  ActionButton,
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
  SearchField,
  Text,
  View,
} from "@adobe/react-spectrum";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDto } from "@agentboard/shared";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAppStore } from "./store";

const GlobalDashboardPage = lazy(async () => {
  const module = await import("./pages/global-dashboard-page");
  return { default: module.GlobalDashboardPage };
});
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

const projectSections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "plans", label: "Plans" },
  { id: "tasks", label: "Tasks" },
  { id: "context", label: "Context" },
  { id: "agent-runs", label: "Agent Runs" },
  { id: "git", label: "Git" },
] as const;

function RouteLoader() {
  return (
    <Flex alignItems="center" justifyContent="center" minHeight="320px">
      <ProgressCircle aria-label="Loading page" isIndeterminate />
    </Flex>
  );
}

function NavItem(props: { to: string; label: string; indent?: boolean }) {
  return (
    <NavLink
      to={props.to}
      style={({ isActive }) => ({
        color: "inherit",
        textDecoration: "none",
        display: "block",
        padding: "8px 10px",
        borderRadius: "10px",
        marginLeft: props.indent ? "18px" : "0",
        background: isActive ? "rgba(69, 91, 135, 0.2)" : "transparent",
        fontWeight: isActive ? 600 : 400,
      })}
    >
      {props.label}
    </NavLink>
  );
}

function redirectToProjectPath(activeProjectId: string | null, section: string) {
  return activeProjectId ? `/projects/${activeProjectId}/${section}` : "/projects";
}

function Shell() {
  const location = useLocation();
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
    expandedProjects,
    setProjectExpanded,
    toggleProjectExpanded,
  } = useAppStore();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const [paletteQuery, setPaletteQuery] = useState("");

  const activeProjectIdFromRoute = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;

  useEffect(() => {
    if (activeProjectIdFromRoute) {
      setActiveProjectId(activeProjectIdFromRoute);
      setProjectExpanded(activeProjectIdFromRoute, true);
      return;
    }

    if (!activeProjectId && projectsQuery.data?.[0]) {
      setActiveProjectId(projectsQuery.data[0].id);
    }
  }, [activeProjectId, activeProjectIdFromRoute, projectsQuery.data, setActiveProjectId, setProjectExpanded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteQuery("");
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
  const defaultProjectId = activeProjectId ?? projectsQuery.data?.[0]?.id ?? null;

  const commands = [
    { id: "open-dashboard", label: "Open Global Dashboard", run: () => navigate("/dashboard") },
    { id: "open-projects", label: "Open Projects", run: () => navigate("/projects") },
    { id: "open-project-dashboard", label: "Open Project Dashboard", run: () => navigate(redirectToProjectPath(defaultProjectId, "dashboard")) },
    { id: "create-task", label: "Create Task", run: () => navigate(redirectToProjectPath(defaultProjectId, "tasks")) },
    { id: "create-plan", label: "Create Plan", run: () => navigate(redirectToProjectPath(defaultProjectId, "plans")) },
    { id: "create-context-item", label: "Create Context Item", run: () => navigate(redirectToProjectPath(defaultProjectId, "context")) },
    { id: "create-context-pack", label: "Create Context Pack", run: () => navigate(redirectToProjectPath(defaultProjectId, "context")) },
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
    { id: "search-context", label: "Search Context", run: () => navigate(redirectToProjectPath(defaultProjectId, "context")) },
    { id: "open-git", label: "Open Git", run: () => navigate(redirectToProjectPath(defaultProjectId, "git")) },
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
          <Flex direction="column" gap="size-100">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/projects" label="Projects" />
          </Flex>
          <Flex direction="column" gap="size-100" marginTop="size-150">
            {(projectsQuery.data ?? []).map((project) => {
              const expanded = expandedProjects[project.id] ?? false;
              const isActiveProject = activeProjectId === project.id || activeProjectIdFromRoute === project.id;

              return (
                <View key={project.id}>
                  <Flex alignItems="center" gap="size-100">
                    <ActionButton aria-label={expanded ? `Collapse ${project.name}` : `Expand ${project.name}`} onPress={() => toggleProjectExpanded(project.id)}>
                      {expanded ? "-" : "+"}
                    </ActionButton>
                    <Button
                      variant={isActiveProject ? "accent" : "secondary"}
                      onPress={() => {
                        setActiveProjectId(project.id);
                        setProjectExpanded(project.id, true);
                        navigate(`/projects/${project.id}/dashboard`);
                      }}
                    >
                      {project.name}
                    </Button>
                  </Flex>
                  {expanded ? (
                    <Flex direction="column" gap="size-50" marginTop="size-75">
                      {projectSections.map((section) => (
                        <NavItem key={section.id} to={`/projects/${project.id}/${section.id}`} label={section.label} indent />
                      ))}
                    </Flex>
                  ) : null}
                </View>
              );
            })}
          </Flex>
          <Divider size="S" marginY="size-250" />
          <NavItem to="/settings" label="Settings" />
          {activeProjectId ? (
            <Text UNSAFE_style={{ marginTop: "12px", fontSize: "12px", opacity: 0.8 }}>Active project: {projectsQuery.data?.find((project) => project.id === activeProjectId)?.name}</Text>
          ) : null}
        </View>
        <View flex minWidth={0} padding="size-250" overflow="auto">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<GlobalDashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<Navigate to="dashboard" replace />} />
              <Route path="/projects/:projectId/dashboard" element={<DashboardPage />} />
              <Route path="/projects/:projectId/plans" element={<PlansPage />} />
              <Route path="/projects/:projectId/tasks" element={<TasksPage onSelectTask={setSelectedTaskId} />} />
              <Route path="/projects/:projectId/context" element={<ContextPage />} />
              <Route path="/projects/:projectId/agent-runs" element={<AgentRunsPage />} />
              <Route path="/projects/:projectId/git" element={<GitPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/plans" element={<Navigate to={redirectToProjectPath(defaultProjectId, "plans")} replace />} />
              <Route path="/tasks" element={<Navigate to={redirectToProjectPath(defaultProjectId, "tasks")} replace />} />
              <Route path="/context" element={<Navigate to={redirectToProjectPath(defaultProjectId, "context")} replace />} />
              <Route path="/agent-runs" element={<Navigate to={redirectToProjectPath(defaultProjectId, "agent-runs")} replace />} />
              <Route path="/git" element={<Navigate to={redirectToProjectPath(defaultProjectId, "git")} replace />} />
            </Routes>
          </Suspense>
        </View>
      </Flex>
      <DialogContainer onDismiss={() => setCommandPaletteOpen(false)}>
        {commandPaletteOpen ? (
          (() => {
            const matches = commands.filter((command) => command.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()));
            const runCommand = (id: string | number) => {
              const command = commands.find((entry) => entry.id === id);
              setCommandPaletteOpen(false);
              command?.run();
            };
            return (
              <Dialog>
                <Heading>Command Palette</Heading>
                <Divider />
                <Content>
                  <Flex direction="column" gap="size-100">
                    <SearchField
                      aria-label="Search commands"
                      autoFocus
                      value={paletteQuery}
                      onChange={setPaletteQuery}
                      onSubmit={() => {
                        if (matches[0]) runCommand(matches[0].id);
                      }}
                    />
                    <ListBox
                      aria-label="Command palette"
                      items={matches}
                      selectionMode="single"
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0];
                        if (key !== undefined) runCommand(key);
                      }}
                    >
                      {(command) => <Item key={command.id}>{command.label}</Item>}
                    </ListBox>
                  </Flex>
                </Content>
              </Dialog>
            );
          })()
        ) : null}
      </DialogContainer>
    </Flex>
  );
}

export function App() {
  return <Shell />;
}

export { KanbanColumn } from "./pages/tasks-page";
