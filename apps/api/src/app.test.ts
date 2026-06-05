import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { SimpleGitService } from "./services/simple-git-service";

describe("app", () => {
  it("builds with service abstractions", async () => {
    const app = buildApp({
      gitService: new SimpleGitService(),
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
