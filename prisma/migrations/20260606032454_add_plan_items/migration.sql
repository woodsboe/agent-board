-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "convertedAt" DATETIME;
ALTER TABLE "Plan" ADD COLUMN "generatedByProfileId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "generationMessages" TEXT;
ALTER TABLE "Plan" ADD COLUMN "generationModel" TEXT;
ALTER TABLE "Plan" ADD COLUMN "generationTokens" TEXT;

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "suggestedAgentProfileId" TEXT,
    "suggestedContextPackId" TEXT,
    CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
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
    "planItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedAgentProfileId_fkey" FOREIGN KEY ("assignedAgentProfileId") REFERENCES "AgentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_contextPackId_fkey" FOREIGN KEY ("contextPackId") REFERENCES "ContextPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assignedAgentProfileId", "contextPackId", "createdAt", "description", "id", "parentTaskId", "planId", "priority", "projectId", "status", "title", "updatedAt") SELECT "assignedAgentProfileId", "contextPackId", "createdAt", "description", "id", "parentTaskId", "planId", "priority", "projectId", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_planItemId_key" ON "Task"("planItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
