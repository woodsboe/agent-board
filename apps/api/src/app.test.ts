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

  // Regression: the desktop client sends body-less mutations with a
  // `Content-Type: application/json` header. Fastify's default parser rejects an
  // empty JSON body (FST_ERR_CTP_EMPTY_JSON_BODY, 400), which silently broke
  // Approve/Archive/Duplicate/Delete in the UI. The server must tolerate it.
  it("approves a plan via a body-less PATCH carrying a JSON content-type", async () => {
    const app = buildApp({ gitService: new SimpleGitService() });
    const project = await app.prisma.project.create({
      data: { name: "Approve Test", description: "d", gitRepositoryPath: "/tmp/approve-test" },
    });
    const plan = await app.prisma.plan.create({
      data: { projectId: project.id, title: "Plan", description: "d" },
    });

    try {
      const response = await app.inject({
        method: "PATCH",
        url: `/plans/${plan.id}/approve`,
        headers: { "content-type": "application/json" },
        // no payload — mirrors api.approvePlan(id)
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("Approved");
    } finally {
      await app.prisma.project.delete({ where: { id: project.id } });
    }
  });
});
