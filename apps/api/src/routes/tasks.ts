import type { FastifyInstance } from "fastify";
import { createTaskInputSchema } from "@agentboard/shared";
import { mapTask } from "../lib/mappers";

export async function taskRoutes(app: FastifyInstance) {
  app.get("/tasks", async (request) => {
    const query = request.query as { projectId?: string };
    const tasks = await app.prisma.task.findMany({
      where: query.projectId ? { projectId: query.projectId } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return tasks.map(mapTask);
  });

  app.post("/tasks", async (request, reply) => {
    const input = createTaskInputSchema.parse(request.body);
    const task = await app.prisma.task.create({ data: input });
    reply.code(201);
    return mapTask(task);
  });

  app.patch("/tasks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const data = createTaskInputSchema.partial().parse(request.body);
    const task = await app.prisma.task.update({ where: { id }, data });
    return mapTask(task);
  });
}
