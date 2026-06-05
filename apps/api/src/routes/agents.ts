import type { FastifyInstance } from "fastify";
import {
  createAgentProfileInputSchema,
  createAgentRunInputSchema,
  updateAgentProfileInputSchema,
  type AgentRunEvent,
} from "@agentboard/shared";
import { diffContextSnapshots, providerRuntimeKind, type AgentProvider } from "@agentboard/domain";
import type { ContextSnapshotItem } from "@agentboard/domain";
import { decryptSecret } from "../lib/crypto";
import { mapAgentProfile, mapAgentRun } from "../lib/mappers";
import { publishRunEvent, subscribeToRun } from "../lib/run-broker";
import { resolveAdapter } from "../services/adapters/registry";

type ExecuteParams = {
  runId: string;
  provider: string;
  model: string;
  systemPrompt: string;
  baseUrl: string | null;
  temperature: number | null;
  maxTokens: number | null;
  apiKey: string | null;
  prompt: string;
  contextSnapshot: ContextSnapshotItem[];
  repositoryPath: string;
};

/** Runs an agent in the background, streaming chunks to the broker and persisting the result. */
async function executeRun(app: FastifyInstance, params: ExecuteParams): Promise<void> {
  const { runId } = params;
  try {
    const { adapter, effectiveProvider } = resolveAdapter(params.provider, params.apiKey, params.baseUrl);
    publishRunEvent(runId, { type: "status", status: "Running" });

    const result = await adapter.runTask(
      {
        provider: effectiveProvider,
        model: params.model,
        systemPrompt: params.systemPrompt,
        baseUrl: params.baseUrl,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        apiKey: params.apiKey,
        prompt: params.prompt,
        contextSnapshot: params.contextSnapshot,
        repositoryPath: params.repositoryPath,
      },
      (text) => publishRunEvent(runId, { type: "chunk", text }),
    );

    const updated = await app.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: result.status,
        output: result.output,
        error: result.error ?? null,
        completedAt: new Date(),
        tokenUsage: { create: result.tokenUsage },
      },
      include: { tokenUsage: true },
    });
    publishRunEvent(runId, { type: "done", run: mapAgentRun(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await app.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "Failed", error: message, completedAt: new Date() },
      });
    } catch {
      // run row may have been deleted; nothing actionable here
    }
    publishRunEvent(runId, { type: "error", message });
  }
}

export async function agentRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------- profiles
  app.get("/agent-profiles", async () => {
    const profiles = await app.prisma.agentProfile.findMany({ orderBy: { name: "asc" } });
    return profiles.map(mapAgentProfile);
  });

  app.post("/agent-profiles", async (request, reply) => {
    const input = createAgentProfileInputSchema.parse(request.body);
    const profile = await app.prisma.agentProfile.create({
      data: {
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        model: input.model,
        provider: input.provider,
        runtimeKind: input.runtimeKind ?? providerRuntimeKind[input.provider as AgentProvider],
        credentialId: input.credentialId ?? null,
        baseUrl: input.baseUrl ?? null,
        temperature: input.temperature ?? null,
        maxTokens: input.maxTokens ?? null,
      },
    });
    reply.code(201);
    return mapAgentProfile(profile);
  });

  app.patch("/agent-profiles/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateAgentProfileInputSchema.parse(request.body);
    const profile = await app.prisma.agentProfile.update({ where: { id }, data: { ...input } });
    return mapAgentProfile(profile);
  });

  app.delete("/agent-profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.agentProfile.delete({ where: { id } });
    reply.code(204);
  });

  // -------------------------------------------------------------- agent runs
  app.get("/agent-runs", async (request) => {
    const query = request.query as { projectId?: string; taskId?: string };
    const runs = await app.prisma.agentRun.findMany({
      where: {
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
      },
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
    const project = await app.prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });
    const profile = await app.prisma.agentProfile.findUniqueOrThrow({ where: { id: input.agentProfileId } });

    const contextPack = task.contextPackId
      ? await app.prisma.contextPack.findUnique({
          where: { id: task.contextPackId },
          include: { items: { include: { contextItem: true } } },
        })
      : null;

    const contextSnapshot: ContextSnapshotItem[] = contextPack
      ? contextPack.items.map((item) => ({
          id: item.contextItem.id,
          title: item.contextItem.title,
          tokenEstimate: item.contextItem.tokenEstimate,
          updatedAt: item.contextItem.updatedAt.toISOString(),
        }))
      : [];

    const prompt = [
      `Agent Profile: ${profile.name}`,
      `System Prompt: ${profile.systemPrompt}`,
      `Task: ${task.title}`,
      `Description: ${task.description}`,
      `Context Items: ${contextSnapshot.map((item) => item.title).join(", ") || "None"}`,
    ].join("\n");

    const run = await app.prisma.agentRun.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        agentProfileId: input.agentProfileId,
        status: "Running",
        prompt,
        output: "",
        contextSnapshot: JSON.stringify(contextSnapshot),
        startedAt: new Date(),
      },
      include: { tokenUsage: true },
    });

    let apiKey: string | null = null;
    if (profile.credentialId) {
      const credential = await app.prisma.credential.findUnique({ where: { id: profile.credentialId } });
      if (credential) {
        try {
          apiKey = decryptSecret(credential.encrypted);
        } catch {
          apiKey = null;
        }
      }
    }

    // Fire-and-forget: the run streams to the broker and finalizes itself.
    void executeRun(app, {
      runId: run.id,
      provider: profile.provider,
      model: profile.model,
      systemPrompt: profile.systemPrompt,
      baseUrl: profile.baseUrl,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      apiKey,
      prompt,
      contextSnapshot,
      repositoryPath: project.gitRepositoryPath,
    });

    reply.code(201);
    return mapAgentRun(run);
  });

  app.get("/agent-runs/:id/stream", async (request, reply) => {
    const { id } = request.params as { id: string };

    // We own the raw response for the lifetime of the stream.
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    reply.raw.write("retry: 3000\n\n");

    let closed = false;
    let sub: { unsubscribe: () => void; alreadyDone: boolean } | undefined;

    const finish = () => {
      if (closed) return;
      closed = true;
      sub?.unsubscribe();
      reply.raw.end();
    };

    const send = (event: AgentRunEvent) => {
      if (closed) return;
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === "done" || event.type === "error") finish();
    };

    sub = subscribeToRun(id, send);
    if (sub.alreadyDone) finish();
    request.raw.on("close", () => {
      closed = true;
      sub?.unsubscribe();
    });
  });
}
