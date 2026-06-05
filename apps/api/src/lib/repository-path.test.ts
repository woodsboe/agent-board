import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRepositoryPath } from "./repository-path";

describe("resolveRepositoryPath", () => {
  it("expands a leading ~/ to the home directory", () => {
    expect(resolveRepositoryPath("~/www/repo")).toBe(path.join(os.homedir(), "www/repo"));
  });

  it("expands a bare ~ to the home directory", () => {
    expect(resolveRepositoryPath("~")).toBe(os.homedir());
  });

  it("leaves absolute paths untouched", () => {
    expect(resolveRepositoryPath("/Users/test/repo")).toBe("/Users/test/repo");
  });

  it("does not expand ~ that is not a path prefix", () => {
    expect(resolveRepositoryPath("/tmp/~backup")).toBe("/tmp/~backup");
  });

  it("trims surrounding whitespace", () => {
    expect(resolveRepositoryPath("  /Users/test/repo  ")).toBe("/Users/test/repo");
  });
});
