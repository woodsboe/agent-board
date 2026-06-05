import { Button, Content, Flex, ProgressCircle, Text, View, Well } from "@adobe/react-spectrum";
import { useQueries, useQuery } from "@tanstack/react-query";
import { SectionHeader, StatTile, SurfaceCard } from "@agentboard/ui";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function GlobalDashboardPage() {
  const navigate = useNavigate();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const agentProfilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const projectDashboards = useQueries({
    queries: (projectsQuery.data ?? []).map((project) => ({
      queryKey: ["dashboard", project.id],
      queryFn: () => api.getDashboard(project.id),
      enabled: Boolean(project.id),
    })),
  });

  if (projectsQuery.isLoading) {
    return <ProgressCircle aria-label="Loading global dashboard" isIndeterminate />;
  }

  const dashboards = projectDashboards.flatMap((query) => (query.data ? [query.data] : []));
  const totalProjects = projectsQuery.data?.length ?? 0;
  const runningTasks = dashboards.reduce((sum, dashboard) => sum + dashboard.runningTasks, 0);
  const openTasks = dashboards.reduce((sum, dashboard) => sum + dashboard.openTasks, 0);
  const completedTasks = dashboards.reduce((sum, dashboard) => sum + dashboard.completedTasks, 0);
  const tokenUsage = dashboards.reduce((sum, dashboard) => sum + dashboard.tokenUsageByProject, 0);
  const recentRuns = dashboards
    .flatMap((dashboard) => dashboard.recentRuns.map((run) => ({ ...run, projectId: dashboard.projectId })))
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .slice(0, 6);
  const projectNames = new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name]));

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Dashboard" />
      <Flex gap="size-200" wrap>
        <StatTile label="Projects" value={totalProjects} hint="Tracked workspaces" />
        <StatTile label="Connected Agents" value={agentProfilesQuery.data?.length ?? 0} hint="Execution profiles" />
        <StatTile label="Running Tasks" value={runningTasks} hint="Across all projects" />
        <StatTile label="Token Usage" value={tokenUsage} hint="Recent total tokens" />
      </Flex>
      <Flex gap="size-200" wrap>
        <SurfaceCard title="Portfolio Status" description="Cross-project execution health at a glance.">
          <Content>Open Tasks: {openTasks}</Content>
          <Content>Completed Tasks: {completedTasks}</Content>
          <Content>Recent Runs: {recentRuns.length}</Content>
        </SurfaceCard>
        <SurfaceCard title="Projects" description="Each project keeps its own dashboard and operational workspace.">
          <Flex direction="column" gap="size-100">
            {(projectsQuery.data ?? []).map((project) => {
              const dashboard = dashboards.find((entry) => entry.projectId === project.id);
              return (
                <Well key={project.id}>
                  <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                    <View>
                      <Text>{project.name}</Text>
                      <Content>{project.description}</Content>
                      <Content>
                        {dashboard?.runningTasks ?? 0} running / {dashboard?.openTasks ?? 0} open / {dashboard?.completedTasks ?? 0} done
                      </Content>
                    </View>
                    <Button variant="accent" onPress={() => navigate(`/projects/${project.id}/dashboard`)}>
                      Open Project
                    </Button>
                  </Flex>
                </Well>
              );
            })}
          </Flex>
        </SurfaceCard>
        <SurfaceCard title="Recent Runs" description="Latest agent activity across projects.">
          <Flex direction="column" gap="size-100">
            {recentRuns.length ? (
              recentRuns.map((run) => (
                <Well key={run.id}>
                  <Text>{projectNames.get(run.projectId) ?? "Project"}</Text>
                  <Content>{run.output.split("\n")[0]}</Content>
                  <Content>{new Date(run.startedAt).toLocaleString()}</Content>
                </Well>
              ))
            ) : (
              <Content>No agent runs recorded yet.</Content>
            )}
          </Flex>
        </SurfaceCard>
      </Flex>
    </Flex>
  );
}
