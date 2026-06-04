import { Content, Flex, ProgressCircle } from "@adobe/react-spectrum";
import { useQuery } from "@tanstack/react-query";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useProjectId } from "../use-project-id";

export function GitPage() {
  const projectId = useProjectId();
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
