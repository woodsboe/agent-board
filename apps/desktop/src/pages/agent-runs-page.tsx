import { Content, Divider, Flex, Text, View } from "@adobe/react-spectrum";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentRunWithDiffDto } from "@agentboard/shared";
import { Chip, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { LiveRunOutput, useRunStream } from "../components/run-stream";
import { runStatusTone } from "../task-presentation";
import { useProjectId } from "../use-project-id";

export function AgentRunsPage() {
  const projectId = useProjectId();
  const runsQuery = useQuery({ queryKey: ["agent-runs", projectId], queryFn: () => api.getAgentRuns(projectId!), enabled: Boolean(projectId) });
  const profilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const profileNames = new Map((profilesQuery.data ?? []).map((profile) => [profile.id, profile.name]));

  if (!projectId) return <EmptyState label="No project selected" />;

  const runs = runsQuery.data ?? [];

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Agent Runs" description="Execution history with live output, token cost, and context diffs." />
      {runs.length ? (
        runs.map((run) => <RunCard key={run.id} run={run} projectId={projectId} agentName={profileNames.get(run.agentProfileId) ?? "Agent"} />)
      ) : (
        <Content>No agent runs recorded yet. Run an agent from the Tasks board.</Content>
      )}
    </Flex>
  );
}

function diffSummary(label: string, items: { title: string }[]) {
  if (!items.length) return null;
  return (
    <Content>
      {label}: {items.map((item) => item.title).join(", ")}
    </Content>
  );
}

function RunCard(props: { run: AgentRunWithDiffDto; projectId: string; agentName: string }) {
  const { run } = props;
  const queryClient = useQueryClient();
  const isLive = run.status === "Running";
  const stream = useRunStream(isLive ? run.id : null, () => {
    queryClient.invalidateQueries({ queryKey: ["agent-runs", props.projectId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", props.projectId] });
  });

  const status = isLive ? stream.status ?? run.status : run.status;
  const output = isLive ? stream.output : run.output;

  return (
    <div data-testid="agent-run-card">
      <SurfaceCard
        title={props.agentName}
        actions={<Chip label={status} tone={runStatusTone[status]} />}
      >
        <Flex direction="column" gap="size-100">
          <Content>
            {new Date(run.startedAt).toLocaleString()}
            {run.completedAt ? ` → ${new Date(run.completedAt).toLocaleTimeString()}` : " • in progress"}
          </Content>
          {run.tokenUsage ? (
            <Content>
              {run.tokenUsage.promptTokens} prompt / {run.tokenUsage.completionTokens} completion / {run.tokenUsage.totalTokens} total • ${run.tokenUsage.estimatedCost}
            </Content>
          ) : null}

          <Text UNSAFE_style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>Output</Text>
          <LiveRunOutput output={output} status={isLive ? status : null} error={isLive ? stream.error : run.error} />

          {run.contextSnapshot.length ? (
            <>
              <Divider size="S" marginY="size-100" />
              <Text UNSAFE_style={{ fontSize: "12px", opacity: 0.7 }}>Context: {run.contextSnapshot.map((item) => item.title).join(", ")}</Text>
            </>
          ) : null}

          {run.contextDiff && (run.contextDiff.added.length || run.contextDiff.removed.length || run.contextDiff.modified.length) ? (
            <View>
              <Flex gap="size-75" marginTop="size-100" marginBottom="size-75">
                <Chip label={`+${run.contextDiff.added.length} added`} tone="positive" />
                <Chip label={`-${run.contextDiff.removed.length} removed`} tone="negative" />
                <Chip label={`~${run.contextDiff.modified.length} modified`} tone="warning" />
              </Flex>
              {diffSummary("Added", run.contextDiff.added)}
              {diffSummary("Removed", run.contextDiff.removed)}
              {diffSummary("Modified", run.contextDiff.modified)}
            </View>
          ) : null}
        </Flex>
      </SurfaceCard>
    </div>
  );
}
