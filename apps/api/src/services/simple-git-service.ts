import { existsSync } from "node:fs";
import simpleGit from "simple-git";
import type { GitAccountInfo, GitService } from "@agentboard/services";
import type { GitDashboardDto, IssueDto, PullRequestDto } from "@agentboard/shared";

function accountSummary(account: GitAccountInfo | null): GitDashboardDto["account"] {
  return account
    ? { id: account.id, name: account.name, authorName: account.authorName, authorEmail: account.authorEmail, host: account.host }
    : null;
}

/** Empty dashboard carrying a human-readable status in place of commit info. */
function unavailableDashboard(account: GitAccountInfo | null, status: string): GitDashboardDto {
  return {
    branch: "",
    latestCommit: status,
    modifiedFiles: [],
    untrackedFiles: [],
    ahead: 0,
    behind: 0,
    tracking: null,
    branches: [],
    recentCommits: [],
    account: accountSummary(account),
  };
}

/** owner/repo (or group/subgroup/repo for GitLab) from an https or ssh remote URL. */
export function parseSlug(remote: string): string | null {
  const trimmed = remote.trim().replace(/\.git$/, "");
  if (!trimmed) return null;

  const ssh = trimmed.match(/^[^@]+@[^:]+:(.+)$/); // git@host:owner/repo
  if (ssh) return ssh[1];

  try {
    return new URL(trimmed).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 200);
  } catch {
    return "";
  }
}

export class SimpleGitService implements GitService {
  async inspectRepository(repositoryPath: string, account: GitAccountInfo | null): Promise<GitDashboardDto> {
    // simpleGit() throws synchronously if the directory is missing, so guard before constructing.
    if (!repositoryPath || !existsSync(repositoryPath)) {
      return unavailableDashboard(account, "Repository path not found");
    }

    const git = simpleGit(repositoryPath);
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
      return unavailableDashboard(account, "Not a Git repository");
    }

    const [status, log, branches] = await Promise.all([
      git.status(),
      git.log({ maxCount: 10 }),
      git.branchLocal(),
    ]);

    return {
      branch: status.current ?? branches.current ?? "",
      latestCommit: log.latest ? `${log.latest.hash.slice(0, 7)} ${log.latest.message}` : "No commits",
      modifiedFiles: status.modified,
      untrackedFiles: status.not_added,
      ahead: status.ahead,
      behind: status.behind,
      tracking: status.tracking ?? null,
      branches: branches.all,
      recentCommits: log.all.map((commit) => ({
        hash: commit.hash.slice(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      })),
      account: accountSummary(account),
    };
  }

  async listPullRequests(repositoryPath: string, account: GitAccountInfo): Promise<PullRequestDto[]> {
    const slug = await this.resolveSlug(repositoryPath, account);
    if (!slug) throw new Error("Could not determine the repository owner/name from the remote. Set the account's remote URL.");
    if (!account.token) throw new Error("This Git account has no access token connected.");
    return account.host === "gitlab" ? gitlabMergeRequests(account, slug) : githubPullRequests(account, slug);
  }

  async listIssues(repositoryPath: string, account: GitAccountInfo): Promise<IssueDto[]> {
    const slug = await this.resolveSlug(repositoryPath, account);
    if (!slug) throw new Error("Could not determine the repository owner/name from the remote. Set the account's remote URL.");
    if (!account.token) throw new Error("This Git account has no access token connected.");
    return account.host === "gitlab" ? gitlabIssues(account, slug) : githubIssues(account, slug);
  }

  private async resolveSlug(repositoryPath: string, account: GitAccountInfo): Promise<string | null> {
    if (account.remoteUrl) {
      const fromAccount = parseSlug(account.remoteUrl);
      if (fromAccount) return fromAccount;
    }
    try {
      const remote = (await simpleGit(repositoryPath).remote(["get-url", "origin"])) as string | undefined;
      return remote ? parseSlug(remote) : null;
    } catch {
      return null;
    }
  }
}

// ----------------------------------------------------------------- GitHub
function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "AgentBoard",
  };
}

async function githubPullRequests(account: GitAccountInfo, slug: string): Promise<PullRequestDto[]> {
  const base = account.apiBaseUrl || "https://api.github.com";
  const response = await fetch(`${base}/repos/${slug}/pulls?state=open&per_page=20`, { headers: githubHeaders(account.token!) });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await safeText(response)}`);
  const data = (await response.json()) as Array<Record<string, any>>;
  return data.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    author: pr.user?.login ?? "unknown",
    url: pr.html_url,
    isDraft: Boolean(pr.draft),
    updatedAt: pr.updated_at,
  }));
}

async function githubIssues(account: GitAccountInfo, slug: string): Promise<IssueDto[]> {
  const base = account.apiBaseUrl || "https://api.github.com";
  const response = await fetch(`${base}/repos/${slug}/issues?state=open&per_page=20`, { headers: githubHeaders(account.token!) });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await safeText(response)}`);
  const data = (await response.json()) as Array<Record<string, any>>;
  // The GitHub issues endpoint also returns PRs; drop those.
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.user?.login ?? "unknown",
      url: issue.html_url,
      updatedAt: issue.updated_at,
    }));
}

// ----------------------------------------------------------------- GitLab
async function gitlabMergeRequests(account: GitAccountInfo, slug: string): Promise<PullRequestDto[]> {
  const base = account.apiBaseUrl || "https://gitlab.com/api/v4";
  const id = encodeURIComponent(slug);
  const response = await fetch(`${base}/projects/${id}/merge_requests?state=opened&per_page=20`, {
    headers: { "PRIVATE-TOKEN": account.token! },
  });
  if (!response.ok) throw new Error(`GitLab API ${response.status}: ${await safeText(response)}`);
  const data = (await response.json()) as Array<Record<string, any>>;
  return data.map((mr) => ({
    id: mr.id,
    number: mr.iid,
    title: mr.title,
    state: mr.state,
    author: mr.author?.username ?? "unknown",
    url: mr.web_url,
    isDraft: Boolean(mr.draft ?? mr.work_in_progress),
    updatedAt: mr.updated_at,
  }));
}

async function gitlabIssues(account: GitAccountInfo, slug: string): Promise<IssueDto[]> {
  const base = account.apiBaseUrl || "https://gitlab.com/api/v4";
  const id = encodeURIComponent(slug);
  const response = await fetch(`${base}/projects/${id}/issues?state=opened&per_page=20`, {
    headers: { "PRIVATE-TOKEN": account.token! },
  });
  if (!response.ok) throw new Error(`GitLab API ${response.status}: ${await safeText(response)}`);
  const data = (await response.json()) as Array<Record<string, any>>;
  return data.map((issue) => ({
    id: issue.id,
    number: issue.iid,
    title: issue.title,
    state: issue.state,
    author: issue.author?.username ?? "unknown",
    url: issue.web_url,
    updatedAt: issue.updated_at,
  }));
}
