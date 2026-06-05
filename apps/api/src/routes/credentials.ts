import type { FastifyInstance } from "fastify";
import { createCredentialInputSchema, updateCredentialInputSchema } from "@agentboard/shared";
import { encryptSecret, maskSecret } from "../lib/crypto";
import { mapCredential } from "../lib/mappers";

/**
 * Credentials are write-once-read-never from the client's perspective: the
 * plaintext secret is encrypted on the way in and only the masked preview is
 * ever returned. Rotating a secret means PATCHing a new `secret` value.
 */
export async function credentialRoutes(app: FastifyInstance) {
  app.get("/credentials", async () => {
    const credentials = await app.prisma.credential.findMany({ orderBy: { createdAt: "desc" } });
    return credentials.map(mapCredential);
  });

  app.post("/credentials", async (request, reply) => {
    const input = createCredentialInputSchema.parse(request.body);
    const credential = await app.prisma.credential.create({
      data: {
        name: input.name,
        kind: input.kind,
        provider: input.provider,
        encrypted: encryptSecret(input.secret),
        preview: maskSecret(input.secret),
      },
    });
    reply.code(201);
    return mapCredential(credential);
  });

  app.patch("/credentials/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateCredentialInputSchema.parse(request.body);
    const credential = await app.prisma.credential.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.provider ? { provider: input.provider } : {}),
        ...(input.secret ? { encrypted: encryptSecret(input.secret), preview: maskSecret(input.secret) } : {}),
      },
    });
    return mapCredential(credential);
  });

  app.delete("/credentials/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.credential.delete({ where: { id } });
    reply.code(204);
  });
}
