import type { FastifyInstance } from "fastify";
import { createAgentRunInputSchema } from "@agentboard/shared";
import { diffContextSnapshots } from "@agentboard/domain";
import { mapAgentProfile, mapAgentRun } from "../lib/mappers";

export async function agentRoutes(app: FastifyInstance) {
  app.get("/agent-profiles", async () => {
    const profiles = await app.prisma.agentProfile.findMany({ orderBy: { name: "asc" } });
    return profiles.map(mapAgentProfile);
  });

  app.get("/agent-runs", async (request) => {
    const query = request.query as { projectId?: string };
    const runs = await app.prisma.agentRun.findMany({
      where: query.projectId ? { projectId: query.projectId } : undefined,
      include: { tokenUsage: true },
      orderBy: { startedAt: "desc" },
    });

    return runs.map((run, index) => {
      const current = mapAgentRun(run);
      const previous = runs[index + 1] ? mapAgentRun(runs[index + 1]) : null;
      return {
        ...current,
        contextDiff: previous ? diffContextSnapshots(previous.contextSnapshot, current.contextSnapshot) : null,
      };
    });
  });

  app.post("/agent-runs", async (request, reply) => {
    const input = createAgentRunInputSchema.parse(request.body);
    const task = await app.prisma.task.findUniqueOrThrow({ where: { id: input.taskId } });
    const contextPack = task.contextPackId
      ? await app.prisma.contextPack.findUnique({
          where: { id: task.contextPackId },
          include: { items: { include: { contextItem: true } } },
        })
      : null;

    const contextSnapshot = contextPack
      ? contextPack.items.map((item) => ({
          id: item.contextItem.id,
          title: item.contextItem.title,
          tokenEstimate: item.contextItem.tokenEstimate,
          updatedAt: item.contextItem.updatedAt.toISOString(),
        }))
      : [];

    const profile = await app.prisma.agentProfile.findUniqueOrThrow({ where: { id: input.agentProfileId } });
    const prompt = [
      `Agent Profile: ${profile.name}`,
      `Task: ${task.title}`,
      `Description: ${task.description}`,
      `Context Items: ${contextSnapshot.map((item) => item.title).join(", ") || "None"}`,
    ].join("\n");

    const execution = await app.agentService.runTask({
      ...input,
      prompt,
      contextSnapshot,
    });

    const run = await app.prisma.agentRun.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        agentProfileId: input.agentProfileId,
        status: execution.status,
        prompt,
        output: execution.output,
        contextSnapshot: JSON.stringify(execution.contextSnapshot),
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
        tokenUsage: {
          create: execution.tokenUsage,
        },
      },
      include: { tokenUsage: true },
    });

    reply.code(201);
    return mapAgentRun(run);
  });
}
