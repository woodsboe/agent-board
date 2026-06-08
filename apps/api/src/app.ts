import Fastify from "fastify";
import cors from "@fastify/cors";
import type { PrismaClient } from "@prisma/client";
import type { GitService } from "@agentboard/services";
import { prisma } from "./lib/prisma";
import { projectRoutes } from "./routes/projects";
import { planRoutes } from "./routes/plans";
import { taskRoutes } from "./routes/tasks";
import { contextRoutes } from "./routes/context";
import { agentRoutes } from "./routes/agents";
import { credentialRoutes } from "./routes/credentials";
import { gitAccountRoutes } from "./routes/git-accounts";
import { dashboardRoutes } from "./routes/dashboard";
import { gitRoutes } from "./routes/git";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    gitService: GitService;
  }
}

export function buildApp(services: { gitService: GitService }) {
  const app = Fastify({ logger: true });

  // Tolerate an empty body on `Content-Type: application/json` requests. Fastify's
  // default parser rejects these with FST_ERR_CTP_EMPTY_JSON_BODY, which breaks
  // body-less mutations (approve/archive/duplicate/delete). Treat empty as no body.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    if (!body) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (error) {
      (error as { statusCode?: number }).statusCode = 400;
      done(error as Error, undefined);
    }
  });

  app.decorate("prisma", prisma);
  app.decorate("gitService", services.gitService);

  app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(400).send({
      error: "Bad Request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(projectRoutes);
  app.register(planRoutes);
  app.register(taskRoutes);
  app.register(contextRoutes);
  app.register(agentRoutes);
  app.register(credentialRoutes);
  app.register(gitAccountRoutes);
  app.register(dashboardRoutes);
  app.register(gitRoutes);

  return app;
}
