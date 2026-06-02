import type { FastifyInstance } from "fastify";

export async function gitRoutes(app: FastifyInstance) {
  app.get("/git/:projectId", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const project = await app.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    return app.gitService.inspectRepository(project.gitRepositoryPath);
  });
}
