import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tokenUsage.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.task.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.contextPackItem.deleteMany();
  await prisma.contextPack.deleteMany();
  await prisma.contextItem.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.project.deleteMany();

  const profiles = await Promise.all(
    [
      ["Frontend Engineer", "Builds UI flows and client-side architecture"],
      ["Backend Engineer", "Implements API and persistence logic"],
      ["Refactoring Specialist", "Improves maintainability with low regression risk"],
      ["QA Reviewer", "Reviews behavior, risk, and test coverage"],
      ["Architecture Reviewer", "Checks boundaries, tradeoffs, and scalability"],
    ].map(([name, description]) =>
      prisma.agentProfile.create({
        data: {
          name,
          description,
          systemPrompt: `${name}: ${description}.`,
          model: "mock-runtime-v1",
        },
      }),
    ),
  );

  const project = await prisma.project.create({
    data: {
      name: "AgentBoard Demo",
      description: "Demo project for local-first agentic project management.",
      gitRepositoryPath: ".",
    },
  });

  const [authPlan, zustandPlan, checkoutPlan] = await Promise.all([
    prisma.plan.create({
      data: {
        projectId: project.id,
        title: "Build Authentication",
        description: "Prepare a future local auth boundary without implementing SaaS auth.",
        status: "Draft",
      },
    }),
    prisma.plan.create({
      data: {
        projectId: project.id,
        title: "Migrate Redux to Zustand",
        description: "Move client state management to simpler local stores.",
        status: "Approved",
      },
    }),
    prisma.plan.create({
      data: {
        projectId: project.id,
        title: "Improve Checkout Performance",
        description: "Reduce interaction latency and payload size in checkout flows.",
        status: "Draft",
      },
    }),
  ]);

  const contextItems = await Promise.all([
    prisma.contextItem.create({
      data: {
        projectId: project.id,
        title: "architecture.md",
        summary: "Platform architecture overview.",
        content: "Hexagonal boundary between UI, services, and persistence.",
        type: "Architecture",
        tokenEstimate: 220,
        tags: "architecture,domain",
        sourceType: "Manual",
        sourceReference: "docs/architecture.md",
      },
    }),
    prisma.contextItem.create({
      data: {
        projectId: project.id,
        title: "zustand-guidelines.md",
        summary: "Migration notes for state management.",
        content: "Prefer feature stores and selectors over global reducers.",
        type: "Decision",
        tokenEstimate: 140,
        tags: "state,zustand",
        sourceType: "File",
        sourceReference: "docs/zustand-guidelines.md",
      },
    }),
    prisma.contextItem.create({
      data: {
        projectId: project.id,
        title: "checkout-api.md",
        summary: "Checkout API contracts and latency budget.",
        content: "Budget 300ms p95 for API endpoints.",
        type: "API",
        tokenEstimate: 180,
        tags: "checkout,api,performance",
        sourceType: "Git",
        sourceReference: "HEAD:docs/checkout-api.md",
      },
    }),
    prisma.contextItem.create({
      data: {
        projectId: project.id,
        title: "old-redux-plan.md",
        summary: "Legacy migration plan kept for audit reference.",
        content: "Old reducer migration steps and deprecation schedule.",
        type: "Constraint",
        tokenEstimate: 90,
        tags: "redux,legacy",
        sourceType: "Manual",
        sourceReference: "notes/redux-plan",
      },
    }),
  ]);

  const pack = await prisma.contextPack.create({
    data: {
      projectId: project.id,
      name: "Zustand Migration Pack",
      description: "Minimal context for the state migration workstream.",
      tokenBudget: 600,
      items: {
        createMany: {
          data: contextItems.slice(0, 3).map((item) => ({ contextItemId: item.id })),
        },
      },
    },
  });

  const statuses = ["Backlog", "Ready", "Running", "Review", "Blocked", "Done"] as const;
  const tasks = await Promise.all(
    statuses.map((status, index) =>
      prisma.task.create({
        data: {
          projectId: project.id,
          planId: index < 2 ? authPlan.id : index < 4 ? zustandPlan.id : checkoutPlan.id,
          title: `${status} Task`,
          description: `Sample task in ${status} column.`,
          status,
          priority: index % 2 === 0 ? "High" : "Medium",
          assignedAgentProfileId: profiles[index % profiles.length].id,
          contextPackId: pack.id,
        },
      }),
    ),
  );

  const run = await prisma.agentRun.create({
    data: {
      projectId: project.id,
      taskId: tasks[2].id,
      agentProfileId: profiles[1].id,
      status: "Completed",
      prompt: "Agent Profile: Backend Engineer\nTask: Running Task",
      output: "Mock execution completed successfully.\nTask analyzed.\nRecommended changes generated.\nReview required.",
      contextSnapshot: JSON.stringify(
        contextItems.slice(0, 2).map((item) => ({
          id: item.id,
          title: item.title,
          tokenEstimate: item.tokenEstimate,
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
      startedAt: new Date(),
      completedAt: new Date(Date.now() + 1200),
      tokenUsage: {
        create: {
          promptTokens: 540,
          completionTokens: 210,
          totalTokens: 750,
          estimatedCost: 0.0019,
        },
      },
    },
  });

  await prisma.agentRun.create({
    data: {
      projectId: project.id,
      taskId: tasks[3].id,
      agentProfileId: profiles[0].id,
      status: "Completed",
      prompt: "Agent Profile: Frontend Engineer\nTask: Review Task",
      output: "Mock execution completed successfully.\nTask analyzed.\nRecommended changes generated.\nReview required.",
      contextSnapshot: JSON.stringify(
        [contextItems[0], contextItems[2]].map((item) => ({
          id: item.id,
          title: item.title,
          tokenEstimate: item.tokenEstimate,
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
      startedAt: new Date(Date.now() + 4000),
      completedAt: new Date(Date.now() + 5800),
      tokenUsage: {
        create: {
          promptTokens: 620,
          completionTokens: 230,
          totalTokens: 850,
          estimatedCost: 0.0021,
        },
      },
    },
  });

  console.log(`Seeded project ${project.name}, context pack ${pack.name}, and initial run ${run.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
