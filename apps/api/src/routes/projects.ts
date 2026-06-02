import type { FastifyInstance } from "fastify";
import { createProjectInputSchema } from "@agentboard/shared";
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
}
