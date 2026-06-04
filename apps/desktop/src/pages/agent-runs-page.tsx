import { Content, Flex, Well } from "@adobe/react-spectrum";
import { useQuery } from "@tanstack/react-query";
import type { AgentRunWithDiffDto } from "@agentboard/shared";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useProjectId } from "../use-project-id";

export function AgentRunsPage() {
  const projectId = useProjectId();
  const runsQuery = useQuery({ queryKey: ["agent-runs", projectId], queryFn: () => api.getAgentRuns(projectId!), enabled: Boolean(projectId) });

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Agent Runs" />
      {(runsQuery.data ?? []).map((run: AgentRunWithDiffDto) => (
        <div key={run.id} data-testid="agent-run-card">
          <SurfaceCard title={run.status}>
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
        </div>
      ))}
    </Flex>
  );
}
