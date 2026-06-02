PRAGMA foreign_keys=OFF;

CREATE TABLE "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "gitRepositoryPath" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AgentProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "model" TEXT NOT NULL
);

CREATE TABLE "ContextItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "tokenEstimate" INTEGER NOT NULL,
  "tags" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContextItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ContextPack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "tokenBudget" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContextPack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "planId" TEXT,
  "parentTaskId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Backlog',
  "priority" TEXT NOT NULL DEFAULT 'Medium',
  "assignedAgentProfileId" TEXT,
  "contextPackId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_assignedAgentProfileId_fkey" FOREIGN KEY ("assignedAgentProfileId") REFERENCES "AgentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_contextPackId_fkey" FOREIGN KEY ("contextPackId") REFERENCES "ContextPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ContextPackItem" (
  "contextPackId" TEXT NOT NULL,
  "contextItemId" TEXT NOT NULL,
  PRIMARY KEY ("contextPackId", "contextItemId"),
  CONSTRAINT "ContextPackItem_contextPackId_fkey" FOREIGN KEY ("contextPackId") REFERENCES "ContextPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContextPackItem_contextItemId_fkey" FOREIGN KEY ("contextItemId") REFERENCES "ContextItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AgentRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "agentProfileId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Queued',
  "prompt" TEXT NOT NULL,
  "output" TEXT NOT NULL,
  "contextSnapshot" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL,
  "completedAt" DATETIME,
  CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TokenUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentRunId" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "estimatedCost" REAL NOT NULL,
  CONSTRAINT "TokenUsage_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TokenUsage_agentRunId_key" ON "TokenUsage"("agentRunId");
PRAGMA foreign_keys=ON;
