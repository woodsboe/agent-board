import type { FastifyInstance } from "fastify";
import type { DashboardDto } from "@agentboard/shared";
import { mapAgentRun } from "../lib/mappers";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/:projectId", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const [tasks, plans, runs] = await Promise.all([
      app.prisma.task.findMany({ where: { projectId } }),
      app.prisma.plan.findMany({ where: { projectId } }),
      app.prisma.agentRun.findMany({
        where: { projectId },
        include: { tokenUsage: true, agentProfile: true },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
    ]);

    const tokenUsageByProject = runs.reduce((sum, run) => sum + (run.tokenUsage?.totalTokens ?? 0), 0);
    const tokenUsageByAgentMap = new Map<string, { agentName: string; totalTokens: number; estimatedCost: number }>();

    for (const run of runs) {
      const key = run.agentProfile.name;
      const current = tokenUsageByAgentMap.get(key) ?? { agentName: key, totalTokens: 0, estimatedCost: 0 };
      current.totalTokens += run.tokenUsage?.totalTokens ?? 0;
      current.estimatedCost += run.tokenUsage?.estimatedCost ?? 0;
      tokenUsageByAgentMap.set(key, current);
    }

    const payload: DashboardDto = {
      projectId,
      openTasks: tasks.filter((task) => task.status !== "Done").length,
      runningTasks: tasks.filter((task) => task.status === "Running").length,
      completedTasks: tasks.filter((task) => task.status === "Done").length,
      activePlans: plans.filter((plan) => plan.status === "Draft").length,
      approvedPlans: plans.filter((plan) => plan.status === "Approved").length,
      recentRuns: runs.map(mapAgentRun),
      tokenUsageByProject,
      tokenUsageByAgent: Array.from(tokenUsageByAgentMap.values()),
    };

    return payload;
  });
}
