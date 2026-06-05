import { describe, expect, it } from "vitest";
import { parseSlug } from "./simple-git-service";

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
