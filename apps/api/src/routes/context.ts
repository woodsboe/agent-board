import type { FastifyInstance } from "fastify";
import {
  createContextItemInputSchema,
  createContextPackInputSchema,
  updateContextItemInputSchema,
  updateContextPackInputSchema,
} from "@agentboard/shared";
import { mapContextItem, mapContextPack } from "../lib/mappers";

export async function contextRoutes(app: FastifyInstance) {
  app.get("/context-items", async (request) => {
    const query = request.query as { projectId?: string; search?: string; type?: string; tag?: string };
    const items = await app.prisma.contextItem.findMany({
      where: {
        projectId: query.projectId,
        type: query.type as never,
        OR: query.search
          ? [
              { title: { contains: query.search } },
              { summary: { contains: query.search } },
              { content: { contains: query.search } },
            ]
          : undefined,
        tags: query.tag ? { contains: query.tag } : undefined,
      },
      orderBy: { updatedAt: "desc" },
    });
    return items.map(mapContextItem);
  });

  app.post("/context-items", async (request, reply) => {
    const input = createContextItemInputSchema.parse(request.body);
    const item = await app.prisma.contextItem.create({
      data: { ...input, tags: input.tags.join(",") },
    });
    reply.code(201);
    return mapContextItem(item);
  });

  app.patch("/context-items/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateContextItemInputSchema.parse(request.body);
    const item = await app.prisma.contextItem.update({
      where: { id },
      data: { ...input, tags: input.tags ? input.tags.join(",") : undefined },
    });
    return mapContextItem(item);
  });

  app.delete("/context-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.contextItem.delete({ where: { id } });
    reply.code(204);
  });

  app.get("/context-packs", async (request) => {
    const query = request.query as { projectId?: string };
    const packs = await app.prisma.contextPack.findMany({
      where: query.projectId ? { projectId: query.projectId } : undefined,
      include: { items: { include: { contextItem: true } } },
      orderBy: { createdAt: "desc" },
    });
    return packs.map(mapContextPack);
  });

  app.post("/context-packs", async (request, reply) => {
    const input = createContextPackInputSchema.parse(request.body);
    const pack = await app.prisma.contextPack.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        tokenBudget: input.tokenBudget,
        items: {
          createMany: {
            data: input.itemIds.map((contextItemId) => ({ contextItemId })),
          },
        },
      },
      include: { items: { include: { contextItem: true } } },
    });
    reply.code(201);
    return mapContextPack(pack);
  });

  app.patch("/context-packs/:id", async (request) => {
    const { id } = request.params as { id: string };
    const input = updateContextPackInputSchema.parse(request.body);
    if (input.itemIds) {
      await app.prisma.contextPackItem.deleteMany({ where: { contextPackId: id } });
      await app.prisma.contextPackItem.createMany({
        data: input.itemIds.map((contextItemId) => ({ contextPackId: id, contextItemId })),
      });
    }
    const pack = await app.prisma.contextPack.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        tokenBudget: input.tokenBudget,
      },
      include: { items: { include: { contextItem: true } } },
    });
    return mapContextPack(pack);
  });

  app.delete("/context-packs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.contextPack.delete({ where: { id } });
    reply.code(204);
  });

  app.post("/context-packs/:id/duplicate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = await app.prisma.contextPack.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    const duplicate = await app.prisma.contextPack.create({
      data: {
        projectId: pack.projectId,
        name: `${pack.name} Copy`,
        description: pack.description,
        tokenBudget: pack.tokenBudget,
        items: {
          createMany: {
            data: pack.items.map((item) => ({ contextItemId: item.contextItemId })),
          },
        },
      },
      include: { items: { include: { contextItem: true } } },
    });
    reply.code(201);
    return mapContextPack(duplicate);
  });
}
