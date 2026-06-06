import type { FastifyInstance, FastifyReply } from "fastify";
import type { Prisma } from "@prisma/client";
import { createPlanInputSchema, updatePlanInputSchema } from "@agentboard/shared";
import { mapPlan, mapTask } from "../lib/mappers";
import { registerPlanGenerationRoutes } from "./plan-generation";

/** Eager-load items (and each item's converted task id) wherever we return a plan. */
const planInclude = {
  items: {
    orderBy: { order: "asc" },
    include: { task: { select: { id: true } } },
  },
} satisfies Prisma.PlanInclude;

export async function planRoutes(app: FastifyInstance) {
  app.get("/plans", async (request) => {
    const query = request.query as { projectId?: string };
    const plans = await app.prisma.plan.findMany({
      where: query.projectId ? { projectId: query.projectId } : undefined,
      orderBy: { createdAt: "desc" },
      include: planInclude,
    });
    return plans.map(mapPlan);
  });

  app.post("/plans", async (request, reply) => {
    const input = createPlanInputSchema.parse(request.body);
    const plan = await app.prisma.plan.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        status: input.status,
        generatedByProfileId: input.generatedByProfileId ?? null,
        generationModel: input.generationModel ?? null,
        generationMessages: input.generationMessages ? JSON.stringify(input.generationMessages) : null,
        generationTokens: input.generationTokens ? JSON.stringify(input.generationTokens) : null,
        items:
          input.items && input.items.length
            ? {
                create: input.items.map((item, index) => ({
                  order: index,
                  title: item.title,
                  description: item.description,
                  priority: item.priority,
                })),
              }
            : undefined,
      },
      include: planInclude,
    });
    reply.code(201);
    return mapPlan(plan);
  });

  app.patch("/plans/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updatePlanInputSchema.parse(request.body);
    const plan = await app.prisma.plan.update({ where: { id }, data: input, include: planInclude });
    return mapPlan(plan);
  });

  app.patch("/plans/:id/approve", async (request) => {
    const { id } = request.params as { id: string };
    const plan = await app.prisma.plan.update({ where: { id }, data: { status: "Approved" }, include: planInclude });
    return mapPlan(plan);
  });

  app.patch("/plans/:id/archive", async (request) => {
    const { id } = request.params as { id: string };
    const plan = await app.prisma.plan.update({ where: { id }, data: { status: "Archived" }, include: planInclude });
    return mapPlan(plan);
  });

  // Convert an approved plan's items into tasks. Skip-only and idempotent: items that
  // already produced a task (linked via Task.planItemId) are left untouched, so re-running
  // never duplicates. Gated on Approved to preserve the human checkpoint.
  app.post("/plans/:id/tasks", async (request, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const plan = await app.prisma.plan.findUniqueOrThrow({
      where: { id },
      include: { items: { orderBy: { order: "asc" }, include: { task: { select: { id: true } } } } },
    });

    if (plan.status !== "Approved") {
      reply.code(409);
      return { error: "Conflict", message: "Only approved plans can be converted to tasks." };
    }

    const pending = plan.items.filter((item) => !item.task);
    const created = [];
    for (const item of pending) {
      const task = await app.prisma.task.create({
        data: {
          projectId: plan.projectId,
          planId: plan.id,
          planItemId: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          status: "Backlog",
          assignedAgentProfileId: item.suggestedAgentProfileId ?? undefined,
          contextPackId: item.suggestedContextPackId ?? undefined,
        },
      });
      created.push(task);
    }

    await app.prisma.plan.update({ where: { id: plan.id }, data: { convertedAt: new Date() } });

    return {
      created: created.length,
      skipped: plan.items.length - pending.length,
      tasks: created.map(mapTask),
    };
  });

  // Agent-driven generation (POST /plans/generate, GET /plans/generations/:id/stream).
  registerPlanGenerationRoutes(app);
}
