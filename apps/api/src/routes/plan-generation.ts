import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { AgentProfile } from "@prisma/client";
import {
  generatePlanInputSchema,
  type AgentTokenUsageDto,
  type PlanGenerationEvent,
  type PlanMessage,
} from "@agentboard/shared";
import { providerRuntimeKind, type AgentProvider } from "@agentboard/domain";
import { decryptSecret } from "../lib/crypto";
import { resolveAdapter } from "../services/adapters/registry";
import { buildGenerationPrompt, extractProposal, mockPlanProposal, PLAN_SYSTEM_INSTRUCTION } from "../lib/plan-proposal";

/**
 * In-memory pub/sub for live plan-generation output — mirrors the agent-run broker.
 * Generation runs asynchronously after `POST /plans/generate` returns; the SSE endpoint
 * may attach before, during, or after, so events are buffered and replayed on subscribe.
 */
type GenerationState = { events: PlanGenerationEvent[]; done: boolean; emitter: EventEmitter };
const generations = new Map<string, GenerationState>();
const EVICT_AFTER_MS = 60_000;

function ensure(id: string): GenerationState {
  let state = generations.get(id);
  if (!state) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    state = { events: [], done: false, emitter };
    generations.set(id, state);
  }
  return state;
}

function publishGenerationEvent(id: string, event: PlanGenerationEvent): void {
  const state = ensure(id);
  state.events.push(event);
  state.emitter.emit("event", event);
  if (event.type === "done" || event.type === "error") {
    state.done = true;
    setTimeout(() => generations.delete(id), EVICT_AFTER_MS);
  }
}

function subscribeToGeneration(
  id: string,
  onEvent: (event: PlanGenerationEvent) => void,
): { unsubscribe: () => void; alreadyDone: boolean } {
  const state = ensure(id);
  for (const event of state.events) onEvent(event);
  if (state.done) return { unsubscribe: () => {}, alreadyDone: true };
  const handler = (event: PlanGenerationEvent) => onEvent(event);
  state.emitter.on("event", handler);
  return { unsubscribe: () => state.emitter.off("event", handler), alreadyDone: false };
}

const ZERO_USAGE: AgentTokenUsageDto = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 };

function sumUsage(a: AgentTokenUsageDto, b: AgentTokenUsageDto): AgentTokenUsageDto {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCost: Number((a.estimatedCost + b.estimatedCost).toFixed(6)),
  };
}

type GenerationParams = {
  generationId: string;
  profile: AgentProfile;
  goal: string;
  messages: PlanMessage[];
};

/** Runs generation in the background, streaming to the broker and emitting a structured proposal. */
async function executeGeneration(app: FastifyInstance, params: GenerationParams): Promise<void> {
  const { generationId, profile, goal, messages } = params;
  try {
    publishGenerationEvent(generationId, { type: "status", status: "Running" });

    // Plan drafting uses API/mock runtimes only. CLI runtimes are agentic executors,
    // not chat planners, so we emit a structured starter plan instead of spawning them.
    const runtimeKind = providerRuntimeKind[profile.provider as AgentProvider] ?? "api";
    if (runtimeKind === "cli") {
      publishGenerationEvent(generationId, {
        type: "chunk",
        text: "CLI runtimes aren't used for plan drafting — generating a structured starter plan you can refine.\n",
      });
      publishGenerationEvent(generationId, { type: "status", status: "Completed" });
      publishGenerationEvent(generationId, { type: "done", proposal: mockPlanProposal(goal), tokenUsage: ZERO_USAGE });
      return;
    }

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

    const { adapter, effectiveProvider } = resolveAdapter(profile.provider, apiKey, profile.baseUrl);
    const systemPrompt = `${profile.systemPrompt}\n\n${PLAN_SYSTEM_INSTRUCTION}`;
    const prompt = buildGenerationPrompt(goal, messages);

    const runInput = {
      provider: effectiveProvider,
      model: profile.model,
      systemPrompt,
      baseUrl: profile.baseUrl,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      apiKey,
      contextSnapshot: [],
      repositoryPath: "",
    };

    const result = await adapter.runTask(
      { ...runInput, prompt },
      (text) => publishGenerationEvent(generationId, { type: "chunk", text }),
    );

    if (result.status === "Failed") {
      publishGenerationEvent(generationId, { type: "error", message: result.error ?? "Plan generation failed." });
      return;
    }

    let proposal = extractProposal(result.output);
    let tokenUsage = result.tokenUsage;

    if (!proposal && effectiveProvider === "mock") {
      // Offline/demo: synthesize a deterministic structured plan from the goal.
      proposal = mockPlanProposal(goal);
    } else if (!proposal) {
      // One repair pass for real providers that returned prose instead of JSON.
      const repair = await adapter.runTask(
        { ...runInput, prompt: `${prompt}\n\nYour previous response was not valid JSON. Respond with ONLY the JSON object described — nothing else.` },
        (text) => publishGenerationEvent(generationId, { type: "chunk", text }),
      );
      proposal = extractProposal(repair.output);
      tokenUsage = sumUsage(tokenUsage, repair.tokenUsage);
    }

    if (!proposal) {
      publishGenerationEvent(generationId, {
        type: "error",
        message: "The agent did not return a valid plan. Try rephrasing the goal or refining again.",
      });
      return;
    }

    publishGenerationEvent(generationId, { type: "status", status: "Completed" });
    publishGenerationEvent(generationId, { type: "done", proposal, tokenUsage });
  } catch (error) {
    publishGenerationEvent(generationId, {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function registerPlanGenerationRoutes(app: FastifyInstance): void {
  app.post("/plans/generate", async (request, reply) => {
    const input = generatePlanInputSchema.parse(request.body);
    await app.prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });
    const profile = await app.prisma.agentProfile.findUniqueOrThrow({ where: { id: input.agentProfileId } });

    const generationId = randomUUID();
    ensure(generationId); // buffer exists before execution emits, so no early events are lost

    void executeGeneration(app, {
      generationId,
      profile,
      goal: input.goal,
      messages: input.messages ?? [],
    });

    reply.code(201);
    return { generationId };
  });

  app.get("/plans/generations/:id/stream", async (request, reply) => {
    const { id } = request.params as { id: string };

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

    const send = (event: PlanGenerationEvent) => {
      if (closed) return;
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === "done" || event.type === "error") finish();
    };

    sub = subscribeToGeneration(id, send);
    if (sub.alreadyDone) finish();
    request.raw.on("close", () => {
      closed = true;
      sub?.unsubscribe();
    });
  });
}
