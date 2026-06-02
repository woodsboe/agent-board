import Fastify from "fastify";
import cors from "@fastify/cors";
import type { PrismaClient } from "@prisma/client";
import type { AgentService, GitService } from "@agentboard/services";
import { prisma } from "./lib/prisma";
import { projectRoutes } from "./routes/projects";
import { planRoutes } from "./routes/plans";
import { taskRoutes } from "./routes/tasks";
import { contextRoutes } from "./routes/context";
import { agentRoutes } from "./routes/agents";
import { dashboardRoutes } from "./routes/dashboard";
import { gitRoutes } from "./routes/git";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    agentService: AgentService;
    gitService: GitService;
  }
}

export function buildApp(services: { agentService: AgentService; gitService: GitService }) {
  const app = Fastify({ logger: true });

  app.decorate("prisma", prisma);
  app.decorate("agentService", services.agentService);
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
  app.register(dashboardRoutes);
  app.register(gitRoutes);

  return app;
}
