import type { FastifyInstance } from "fastify";
import { createPlanInputSchema } from "@agentboard/shared";
import { mapPlan } from "../lib/mappers";

export async function planRoutes(app: FastifyInstance) {
  app.get("/plans", async (request) => {
    const query = request.query as { projectId?: string };
    const plans = await app.prisma.plan.findMany({
      where: query.projectId ? { projectId: query.projectId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return plans.map(mapPlan);
  });

  app.post("/plans", async (request, reply) => {
    const input = createPlanInputSchema.parse(request.body);
    const plan = await app.prisma.plan.create({ data: input });
    reply.code(201);
    return mapPlan(plan);
  });

  app.patch("/plans/:id/approve", async (request) => {
    const { id } = request.params as { id: string };
    const plan = await app.prisma.plan.update({ where: { id }, data: { status: "Approved" } });
    return mapPlan(plan);
  });

  app.patch("/plans/:id/archive", async (request) => {
    const { id } = request.params as { id: string };
    const plan = await app.prisma.plan.update({ where: { id }, data: { status: "Archived" } });
    return mapPlan(plan);
  });
}
