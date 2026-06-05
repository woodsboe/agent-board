import type { FastifyInstance } from "fastify";
import { createGitAccountInputSchema, updateGitAccountInputSchema } from "@agentboard/shared";
import { mapGitAccount } from "../lib/mappers";

/** CRUD for Git identities + host connections. The PAT itself lives in a linked Credential. */
export async function gitAccountRoutes(app: FastifyInstance) {
  app.get("/git-accounts", async () => {
    const accounts = await app.prisma.gitAccount.findMany({ orderBy: { createdAt: "desc" } });
    return accounts.map(mapGitAccount);
  });

  app.post("/git-accounts", async (request, reply) => {
    const input = createGitAccountInputSchema.parse(request.body);
    const account = await app.prisma.gitAccount.create({
      data: {
        name: input.name,
        host: input.host,
        authorName: input.authorName,
        authorEmail: input.authorEmail,
        apiBaseUrl: input.apiBaseUrl ?? null,
        remoteUrl: input.remoteUrl ?? null,
        credentialId: input.credentialId ?? null,
      },
    });
    reply.code(201);
    return mapGitAccount(account);
  });

  app.patch("/git-accounts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateGitAccountInputSchema.parse(request.body);
    const account = await app.prisma.gitAccount.update({ where: { id }, data: { ...input } });
    return mapGitAccount(account);
  });

  app.delete("/git-accounts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.gitAccount.delete({ where: { id } });
    reply.code(204);
  });
}
