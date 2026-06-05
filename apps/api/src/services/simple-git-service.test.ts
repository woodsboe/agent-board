import { describe, expect, it } from "vitest";
import { SimpleGitService, parseSlug } from "./simple-git-service";

describe("parseSlug", () => {
  it("parses https remotes", () => {
    expect(parseSlug("https://github.com/owner/repo.git")).toBe("owner/repo");
    expect(parseSlug("https://github.com/owner/repo")).toBe("owner/repo");
  });

  it("parses ssh remotes", () => {
    expect(parseSlug("git@github.com:owner/repo.git")).toBe("owner/repo");
  });

  it("handles nested GitLab groups", () => {
    expect(parseSlug("https://gitlab.com/group/subgroup/repo.git")).toBe("group/subgroup/repo");
  });

  it("returns null for unparseable input", () => {
    expect(parseSlug("")).toBeNull();
    expect(parseSlug("not a url")).toBeNull();
  });
});

describe("SimpleGitService.inspectRepository", () => {
  it("returns a graceful dashboard for a missing directory instead of throwing", async () => {
    const dashboard = await new SimpleGitService().inspectRepository("/no/such/path/abc123", null);
    expect(dashboard.latestCommit).toBe("Repository path not found");
    expect(dashboard.branch).toBe("");
    expect(dashboard.recentCommits).toEqual([]);
    expect(dashboard.account).toBeNull();
  });
});
