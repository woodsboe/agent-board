import type { FastifyInstance } from "fastify";
import { createProjectInputSchema, updateProjectInputSchema } from "@agentboard/shared";
import { mapProject } from "../lib/mappers";

export async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", async () => {
    const projects = await app.prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
    return projects.map(mapProject);
  });

  app.post("/projects", async (request, reply) => {
    const input = createProjectInputSchema.parse(request.body);
    const project = await app.prisma.project.create({ data: input });
    reply.code(201);
    return mapProject(project);
  });

  app.patch("/projects/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateProjectInputSchema.parse(request.body);
    const project = await app.prisma.project.update({ where: { id }, data: input });
    return mapProject(project);
  });
}
