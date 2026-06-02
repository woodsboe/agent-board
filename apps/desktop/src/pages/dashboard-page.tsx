import { Content, Flex, Heading, Meter, ProgressBar, ProgressCircle, Text, View, Well } from "@adobe/react-spectrum";
import { useQuery } from "@tanstack/react-query";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { useAppStore } from "../store";
import { EmptyState } from "../components/EmptyState";

export function DashboardPage() {
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
