import { Content, Flex, Meter, ProgressBar, ProgressCircle, Text, View, Well } from "@adobe/react-spectrum";
import { useQuery } from "@tanstack/react-query";
import { SectionHeader, StatTile, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useProjectId } from "../use-project-id";

export function DashboardPage() {
  const projectId = useProjectId();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => api.getDashboard(projectId!),
    enabled: Boolean(projectId),
  });

  if (!projectId) return <EmptyState label="No project selected" />;
  if (dashboardQuery.isLoading) return <ProgressCircle aria-label="Loading dashboard" isIndeterminate />;

  const data = dashboardQuery.data!;
  const projectName = projectsQuery.data?.find((project) => project.id === projectId)?.name ?? "Project";

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title={`${projectName} Dashboard`} />
      <Flex gap="size-200" wrap>
        <StatTile label="Open Tasks" value={data.openTasks} />
        <StatTile label="Running Tasks" value={data.runningTasks} />
        <StatTile label="Completed Tasks" value={data.completedTasks} />
        <StatTile label="Plans" value={data.activePlans} hint={`${data.approvedPlans} approved`} />
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
