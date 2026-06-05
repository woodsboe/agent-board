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
  await prisma.gitAccount.deleteMany();
  await prisma.credential.deleteMany();

  // Seeded profiles span every runtime so the catalog is self-documenting.
  // None carry a credential, so they transparently fall back to the mock
  // runtime until the user connects a real key — the app works out of the box.
  const profileSpecs: Array<{
    name: string;
    description: string;
    provider: string;
    runtimeKind: string;
    model: string;
    baseUrl?: string;
  }> = [
    { name: "Claude Sonnet (API)", description: "Anthropic Messages API for implementation and review.", provider: "anthropic", runtimeKind: "api", model: "claude-sonnet-4-6" },
    { name: "Claude Code (CLI)", description: "Drives the local `claude` CLI inside the project repo.", provider: "claude-cli", runtimeKind: "cli", model: "claude-code" },
    { name: "Codex (CLI)", description: "Drives the local `codex` CLI inside the project repo.", provider: "codex-cli", runtimeKind: "cli", model: "codex" },
    { name: "GPT (API)", description: "OpenAI chat completions for planning and code generation.", provider: "openai", runtimeKind: "api", model: "gpt-4o" },
    { name: "Local Llama (Ollama)", description: "OpenAI-compatible local model served by Ollama.", provider: "openai-compatible", runtimeKind: "api", model: "llama3.1", baseUrl: "http://localhost:11434/v1" },
  ];

  const profiles = await Promise.all(
    profileSpecs.map((spec) =>
      prisma.agentProfile.create({
        data: {
          name: spec.name,
          description: spec.description,
          systemPrompt: `You are ${spec.name}. ${spec.description} Work carefully and explain your reasoning.`,
          model: spec.model,
          provider: spec.provider,
          runtimeKind: spec.runtimeKind,
          baseUrl: spec.baseUrl ?? null,
        },
      }),
    ),
  );

  const gitAccount = await prisma.gitAccount.create({
    data: {
      name: "Local Workspace",
      host: "github",
      authorName: "AgentBoard Demo",
      authorEmail: "demo@agentboard.local",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "AgentBoard Demo",
      description: "Demo project for local-first agentic project management.",
      gitRepositoryPath: ".",
      gitAccountId: gitAccount.id,
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
      prompt: `Agent Profile: ${profiles[1].name}\nTask: Running Task`,
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
      prompt: `Agent Profile: ${profiles[0].name}\nTask: Review Task`,
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
