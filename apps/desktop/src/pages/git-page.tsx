import { Content, Flex, Link, ProgressCircle, Text, View, Well } from "@adobe/react-spectrum";
import { useQuery } from "@tanstack/react-query";
import { Chip, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useProjectId } from "../use-project-id";

export function GitPage() {
  const projectId = useProjectId();
  const gitQuery = useQuery({ queryKey: ["git", projectId], queryFn: () => api.getGitDashboard(projectId!), enabled: Boolean(projectId) });
  const prQuery = useQuery({ queryKey: ["git-prs", projectId], queryFn: () => api.getPullRequests(projectId!), enabled: Boolean(projectId) });
  const issuesQuery = useQuery({ queryKey: ["git-issues", projectId], queryFn: () => api.getIssues(projectId!), enabled: Boolean(projectId) });

  if (!projectId) return <EmptyState label="No project selected" />;
  if (gitQuery.isLoading) return <ProgressCircle aria-label="Loading git status" isIndeterminate />;
  if (gitQuery.isError) {
    return (
      <Flex direction="column" gap="size-250">
        <SectionHeader title="Git" />
        <SurfaceCard title="Repository unavailable">
          <Content>{(gitQuery.error as Error)?.message ?? "Could not read the repository."}</Content>
        </SurfaceCard>
      </Flex>
    );
  }

  const data = gitQuery.data!;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader
        title="Git"
        description={data.account ? `Identity: ${data.account.authorName} <${data.account.authorEmail}>` : "No Git account linked — set one in Settings → Git Accounts."}
        actions={data.account ? <Chip label={data.account.host} tone="accent" /> : undefined}
      />

      <Flex gap="size-200" wrap alignItems="start">
        <View flex minWidth="size-3600">
          <SurfaceCard title="Repository">
            <Flex direction="column" gap="size-100">
              <Flex gap="size-75" alignItems="center" wrap>
                <Chip label={data.branch || "no branch"} tone="info" />
                {data.tracking ? <Chip label={`↑${data.ahead} ↓${data.behind}`} tone="neutral" title={`tracking ${data.tracking}`} /> : null}
              </Flex>
              <Content>Latest: {data.latestCommit}</Content>
              <Content>Modified: {data.modifiedFiles.length ? data.modifiedFiles.join(", ") : "None"}</Content>
              <Content>Untracked: {data.untrackedFiles.length ? data.untrackedFiles.join(", ") : "None"}</Content>
              {data.branches.length ? <Content>Branches: {data.branches.join(", ")}</Content> : null}
            </Flex>
          </SurfaceCard>
        </View>

        <View flex minWidth="size-3600">
          <SurfaceCard title="Recent Commits">
            {data.recentCommits.length ? (
              <Flex direction="column" gap="size-75">
                {data.recentCommits.map((commit) => (
                  <Well key={commit.hash}>
                    <Text>{commit.message}</Text>
                    <Content>{commit.hash} • {commit.author} • {commit.date}</Content>
                  </Well>
                ))}
              </Flex>
            ) : (
              <Content>No commits.</Content>
            )}
          </SurfaceCard>
        </View>
      </Flex>

      <Flex gap="size-200" wrap alignItems="start">
        <View flex minWidth="size-3600">
          <SurfaceCard title="Open Pull Requests">
            <HostList
              loading={prQuery.isLoading}
              error={prQuery.data?.error}
              empty="No open pull requests."
              items={(prQuery.data?.items ?? []).map((pr) => ({
                key: String(pr.id),
                title: pr.title,
                meta: `#${pr.number} • ${pr.author}${pr.isDraft ? " • draft" : ""}`,
                url: pr.url,
              }))}
            />
          </SurfaceCard>
        </View>

        <View flex minWidth="size-3600">
          <SurfaceCard title="Open Issues">
            <HostList
              loading={issuesQuery.isLoading}
              error={issuesQuery.data?.error}
              empty="No open issues."
              items={(issuesQuery.data?.items ?? []).map((issue) => ({
                key: String(issue.id),
                title: issue.title,
                meta: `#${issue.number} • ${issue.author}`,
                url: issue.url,
              }))}
            />
          </SurfaceCard>
        </View>
      </Flex>
    </Flex>
  );
}

function HostList(props: {
  loading: boolean;
  error?: string;
  empty: string;
  items: Array<{ key: string; title: string; meta: string; url: string }>;
}) {
  if (props.loading) return <ProgressCircle aria-label="Loading" isIndeterminate size="S" />;
  if (props.error) return <Content>{props.error}</Content>;
  if (!props.items.length) return <Content>{props.empty}</Content>;
  return (
    <Flex direction="column" gap="size-75">
      {props.items.map((item) => (
        <Well key={item.key}>
          <Link>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
          </Link>
          <Content>{item.meta}</Content>
        </Well>
      ))}
    </Flex>
  );
}
